# IntimaAI — Healthcare Medical Coding Agent - By Devansh Pokhariya

> *Accurate codes. Respected patients. Smarter healthcare.*
> *https://intima-ai-latest.vercel.app/login*

IntimaAI is an AI-powered medical coding assistant built on **Amazon Bedrock (Nova 2 Lite)**, designed to automate and improve the accuracy of ICD-10-CM diagnosis coding, CPT procedure coding, and payer-specific coverage policy evaluation — while keeping patient dignity and data privacy at the center of everything it does.

---

## The Problem It Solves

Medical coding is one of the most error-prone and time-consuming processes in healthcare administration. A wrong ICD-10 code can mean a denied claim, a delayed treatment, or a patient being misclassified in their health record. Payer policies vary widely and change frequently, making it nearly impossible for coders to stay current manually.

IntimaAI bridges this gap — bringing the precision of AI to a field where precision directly affects patient outcomes and institutional revenue.

---

## Core Capabilities

### 1. ICD-10-CM Diagnosis Code Assignment
IntimaAI reads clinical notes and assigns the most specific, appropriate ICD-10-CM diagnosis codes based on the **FY2026 CDC code set** — the same codes that govern real-world clinical billing from October 1, 2025 onwards. It doesn't just guess — it explains its rationale for every code it assigns, so human coders can verify and learn.

**How it works:**
- Parses free-text clinical documentation
- Identifies all active diagnoses, comorbidities, and complications
- Assigns codes at the highest specificity level (up to 7 characters)
- Provides plain-English rationale for each assignment

### 2. CPT Procedure Code Assignment
Beyond diagnosis, IntimaAI identifies the procedures performed and maps them to the correct CPT codes — ensuring that every billable service is captured accurately and completely.

**How it works:**
- Identifies procedures, services, and interventions from clinical notes
- Assigns appropriate CPT codes with modifier considerations
- Flags common upcoding/downcoding risks
- Explains the clinical basis for each code selected

### 3. Payer-Specific Policy Evaluation
Every payer has different rules — what Aetna approves, UnitedHealthcare may deny. IntimaAI evaluates a clinical scenario against known payer coverage policies and prior authorization criteria, predicting approval or denial before a claim is even submitted.

**How it works:**
- Takes payer name + clinical scenario as input
- Applies known Local Coverage Determinations (LCDs) and Clinical Policy Bulletins
- Returns an approval/denial prediction with the specific policy criteria cited
- Flags missing documentation that could strengthen a claim

### 4. Full Coding Analysis
A single-pass mode that combines all three capabilities — ICD-10, CPT, and payer policy — into one comprehensive coding report for a clinical note.

---

## Bringing Dignity Through Privacy

IntimaAI is built with patient dignity as a non-negotiable design principle — not an afterthought.

**No patient data is stored.** Clinical notes entered into IntimaAI are processed in real time and never persisted to any database or log.

**No training on real patient data.** The model was fine-tuned exclusively on synthetic clinical notes generated from publicly available ICD-10 code descriptions published by the CDC. No real patient records, no MIMIC data without consent controls, no scraping of protected health information.

**AWS infrastructure with HIPAA-eligible services.** IntimaAI runs on Amazon Bedrock, which is a HIPAA-eligible AWS service. For production deployments handling real PHI, a Business Associate Agreement (BAA) with AWS is required and supported.

**Encryption in transit and at rest.** All data passed between the frontend, backend, and Bedrock is encrypted via HTTPS/TLS. Training data stored in Amazon S3 is encrypted at rest.

**Human in the loop.** IntimaAI is designed as a coding *assistant*, not a replacement for certified medical coders. Every output is meant to be reviewed by a qualified professional before submission. The rationale provided with each code is specifically designed to make that review fast and informed.

---

## Architecture

```
User (Browser)
    ↓ HTTPS
Frontend — index.html (Vercel)
    ↓ REST API
Flask Backend — app.py (Render)
    ↓ boto3
Amazon Bedrock — Nova 2 Lite (us-east-1)
    ↓
AI Coding Response → back to user
```

**Training Pipeline (offline):**
```
CDC FY2026 ICD-10 Code Files (74,719 codes)
    ↓
Synthetic Data Generation (Nova Lite via Bedrock)
    ↓
train.jsonl → Amazon S3
    ↓
Bedrock Reinforcement Fine-Tuning (RFT) Job
    ↓ (scored by Lambda Reward Grader)
Fine-tuned Nova 2 Lite Custom Model
```

**Agentic Layer — Amazon Bedrock AgentCore:**
```
Fine-tuned Nova 2 Lite
    ↓
Amazon Bedrock AgentCore Runtime
    ↓
AgentCore Gateway (Unified MCP Tool Server)
    ↓              ↓                  ↓
EHR MCP Server   CMS Codes MCP    Payer Policy MCP
(Live patient    (Real-time        (Live coverage &
 notes)          ICD-10/CPT        prior auth
                 lookups)          decisions)
```

The AgentCore Gateway acts as a centralized, fully managed interface that registers and synchronizes all MCP (Model Context Protocol) servers. When the agent handles a complex query, it can dynamically discover and invoke the right tools — pulling live patient data from an EHR, looking up current code definitions from CMS, or checking the latest payer policy bulletins — all without hardcoded integrations. Each MCP server connection is managed, authenticated, and versioned through the Gateway, making the system extensible as new data sources are added.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Python, Flask, Flask-CORS |
| AI Model | Amazon Bedrock — Amazon Nova 2 Lite |
| Fine-tuning | Bedrock Reinforcement Fine-Tuning (RFT) |
| Reward Grader | AWS Lambda (Python) |
| Training Data | CDC FY2026 ICD-10-CM + Synthetic Generation |
| Data Storage | Amazon S3 |
| IAM | AWS IAM Roles (least-privilege) |
| Agentic Runtime | Amazon Bedrock AgentCore Runtime |
| MCP Gateway | Amazon Bedrock AgentCore Gateway |
| MCP Servers | EHR, CMS Codes, Payer Policy |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |

---

## Project Structure

```
IntimaAI/
├── frontend/
│   └── index.html              # Full UI — 4 coding modes
├── backend/
│   ├── app.py                  # Flask API — 4 endpoints
│   ├── invoke_model.py         # Bedrock model invocation
│   ├── requirements.txt        # Python dependencies
│   └── Procfile                # Render deployment config
├── bedrock/
│   └── scripts/
│       ├── rft_job.py          # RFT training job launcher
│       └── gateway_setup.py    # AgentCore MCP gateway setup
├── lambda/
│   └── reward_grader.py        # RFT reward scoring function
└── icd10cm-table-and-index-April-1-2026/
    ├── icd10cm-codes-April-1-2026.txt   # CDC code file
    └── generate_training_data.py        # Synthetic data generator
```

---

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Health check |
| `/api/icd10` | POST | ICD-10-CM code assignment |
| `/api/cpt` | POST | CPT procedure code assignment |
| `/api/payer-policy` | POST | Payer coverage policy evaluation |
| `/api/analyze` | POST | Full coding analysis (all three) |

**Request body for all endpoints:**
```json
{
  "clinical_note": "Patient clinical documentation here...",
  "payer": "Aetna"
}
```

---

## Running Locally

**Prerequisites:** Python 3.10+, AWS CLI configured with valid credentials

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/IntimaAI.git
cd IntimaAI

# 2. Install dependencies
pip install -r backend/requirements.txt

# 3. Run the backend
cd backend
python app.py

# 4. Open frontend
# Open frontend/index.html in your browser
```

Make sure your AWS credentials have `AmazonBedrockFullAccess` and Nova 2 Lite model access enabled in Bedrock.

---

## Deployment

**Backend → Render**
- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `python app.py`
- Environment variables: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION`

**Frontend → Vercel**
- Root directory: `frontend`
- Framework: Other
- No environment variables needed

---
Access our product at: https://intima-ai-latest.vercel.app/login

## Training Data & Model

IntimaAI's fine-tuned model was trained using:

- **Base model:** Amazon Nova 2 Lite (`amazon.nova-2-lite-v1:0:256k`)
- **Method:** Reinforcement Fine-Tuning (RFT) via Amazon Bedrock
- **Training data:** Synthetic clinical note → ICD-10 code pairs generated from the CDC FY2026 ICD-10-CM code set (74,719 codes, filtered to ~15,000 high-priority clinical codes across 10 specialties)
- **Reward function:** F1 score between predicted codes and reference codes, computed by an AWS Lambda grader
- **Specialties covered:** Gynaecology, Endocrinology, Cardiology, Respiratory, Renal, Musculoskeletal, Gastroenterology, Mental Health, Neurology, Oncology, Preventive Care

---

## Limitations & Responsible Use

- IntimaAI is an **assistive tool** — outputs must be reviewed by certified medical coders before claim submission
- Payer policy predictions are based on known published policies and may not reflect the most recent updates
- CPT code suggestions do not constitute medical advice
- Not a substitute for a certified professional coder (CPC) or certified coding specialist (CCS)
- For production use with real PHI, a HIPAA BAA with AWS is required

---

## Built With

- [Amazon Bedrock](https://aws.amazon.com/bedrock/) — Foundation model hosting and fine-tuning
- [CDC ICD-10-CM FY2026](https://www.cdc.gov/nchs/icd/icd-10-cm/files.html) — Official diagnosis code set
- [Vercel](https://vercel.com/) — Frontend deployment
- [Render](https://render.com/) — Backend deployment

---

