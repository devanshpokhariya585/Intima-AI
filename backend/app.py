"""
Medical Coding Agent — Flask Backend
Bridges the IntimaAI frontend to the fine-tuned Bedrock model.

Endpoints
─────────
GET  /health               → liveness probe (used by frontend status badge)
POST /api/icd10            → ICD-10-CM code assignment
POST /api/cpt              → CPT procedure code assignment
POST /api/payer-policy     → payer coverage / prior-auth check
POST /api/analyze          → full analysis (ICD-10 + CPT + payer policy in one call)

All POST endpoints accept:
    { "clinical_note": "<text>", "payer": "<optional payer name>" }

Run locally:
    python app.py

Environment variables:
    PORT            → HTTP port (default 5000)
    FRONTEND_ORIGIN → allowed CORS origin (default http://localhost:5173)
"""

import os
import sys
import logging

from flask import Flask, request, jsonify
from flask_cors import CORS

# ─── Path setup ───────────────────────────────────────────────────────────────
# Allows running app.py from the /backend directory while bedrock scripts
# live in /bedrock/scripts (matching the project structure in the repo).
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'bedrock', 'scripts'))
from invoke_model import invoke_medical_coder, invoke_full_coding_analysis

# ─── App setup ────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger(__name__)

app = Flask(__name__)

# Allow requests from the Vite dev server AND any deployed frontend origin.
# Set FRONTEND_ORIGIN in your environment when deploying.
CORS(app)  # Open for all origins — fine for local dev


# ─── Helpers ──────────────────────────────────────────────────────────────────
def require_clinical_note(data):
    """Return (note, None) on success or (None, error_response) on failure."""
    if not data or 'clinical_note' not in data:
        return None, (jsonify({'error': 'clinical_note is required'}), 400)
    note = data['clinical_note'].strip()
    if not note:
        return None, (jsonify({'error': 'clinical_note must not be empty'}), 400)
    return note, None


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health():
    """
    Liveness probe.
    Frontend polls this on load to show the backend status badge.
    Returns 200 { status: "ok" } when the server is up.
    """
    return jsonify({'status': 'ok', 'service': 'medical-coding-agent'})


@app.route('/api/icd10', methods=['POST'])
def get_icd10_codes():
    """
    Assign ICD-10-CM diagnosis codes to the given clinical note.

    Request  → { "clinical_note": "..." }
    Response → { "task": "icd10", "result": "..." }
    """
    data = request.get_json(silent=True)
    note, err = require_clinical_note(data)
    if err:
        return err

    log.info('ICD-10 request | note_len=%d', len(note))
    result = invoke_medical_coder(task='icd10', content=note)
    return jsonify(result)


@app.route('/api/cpt', methods=['POST'])
def get_cpt_codes():
    """
    Assign CPT procedure codes to the given clinical note.

    Request  → { "clinical_note": "..." }
    Response → { "task": "cpt", "result": "..." }
    """
    data = request.get_json(silent=True)
    note, err = require_clinical_note(data)
    if err:
        return err

    log.info('CPT request | note_len=%d', len(note))
    result = invoke_medical_coder(task='cpt', content=note)
    return jsonify(result)


@app.route('/api/payer-policy', methods=['POST'])
def check_payer_policy():
    """
    Check payer coverage / prior-auth policy for the given clinical scenario.

    Request  → { "clinical_note": "...", "payer": "Aetna" }
    Response → { "task": "payer_policy", "result": "..." }
    """
    data = request.get_json(silent=True)
    note, err = require_clinical_note(data)
    if err:
        return err

    payer = data.get('payer') or None
    log.info('Payer-policy request | payer=%s | note_len=%d', payer, len(note))
    result = invoke_medical_coder(task='payer_policy', content=note, payer=payer)
    return jsonify(result)


@app.route('/api/analyze', methods=['POST'])
def full_analysis():
    """
    Full medical coding analysis: ICD-10 + CPT + payer policy in a single call.
    This is the default endpoint used by the Home.jsx 'Full Analysis' mode.

    Request  → { "clinical_note": "...", "payer": "Aetna" (optional) }
    Response → { "task": "full_analysis", "result": "..." }
    """
    data = request.get_json(silent=True)
    note, err = require_clinical_note(data)
    if err:
        return err

    payer = data.get('payer') or None
    log.info('Full-analysis request | payer=%s | note_len=%d', payer, len(note))
    result = invoke_full_coding_analysis(clinical_note=note, payer=payer)
    return jsonify(result)


# ─── Error handlers ───────────────────────────────────────────────────────────
@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def server_error(e):
    log.exception('Unhandled server error')
    return jsonify({'error': 'Internal server error'}), 500


# ─── Entry point ──────────────────────────────────────────────────────────────
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    log.info('🏥 Medical Coding Agent backend → http://localhost:%d', port)
    app.run(debug=False, host='0.0.0.0', port=port)