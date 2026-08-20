"""
Bedrock Model Invocation ~ Medical Coding Agent
Uses Amazon Nova 2 Lite base model directly (no fine-tuning, no MCP gateway)
"""

import boto3
import json
from typing import Optional

# ─── CONFIG ──────────────────────────────────────────────────────────────────
AWS_REGION = "us-east-1"
MODEL_ID   = "us.amazon.nova-2-lite-v1:0"  # Base model, no fine-tuning needed
# ─────────────────────────────────────────────────────────────────────────────

bedrock_runtime = boto3.client("bedrock-runtime", region_name=AWS_REGION)

SYSTEM_PROMPT = """You are a certified medical coding assistant specializing in ICD-10-CM, 
ICD-10-PCS, and CPT coding. You assign accurate medical codes based on clinical documentation 
and apply payer-specific coverage policies.

For each request:
1. Identify all relevant diagnoses and procedures
2. Assign the most specific ICD-10 and/or CPT codes
3. Provide a brief rationale for each code
4. Flag any payer policy considerations if relevant

Format your response as:
ICD-10 Codes: [code] ~ [description]
CPT Codes: [code] ~ [description]  
Rationale: [brief explanation]
Payer Notes: [any coverage/prior auth flags]"""


def build_prompt(task: str, content: str, payer: Optional[str] = None) -> str:
    """Build task-specific prompts."""
    if task == "icd10":
        return (
            f"Clinical Note:\n{content}\n\n"
            "Assign all applicable ICD-10-CM diagnosis codes with rationale."
        )
    elif task == "cpt":
        return (
            f"Clinical Note / Procedure Description:\n{content}\n\n"
            "Assign the appropriate CPT procedure codes with rationale."
        )
    elif task == "payer_policy":
        payer_str = f"Payer: {payer}\n" if payer else ""
        return (
            f"{payer_str}"
            f"Clinical Scenario:\n{content}\n\n"
            "Will this claim be approved or denied based on payer policy? "
            "Cite the specific policy criteria."
        )
    else:
        return content


def _invoke(prompt: str, max_tokens: int = 1024) -> str:
    """Core invocation ~ Nova 2 Lite with correct schema."""
    request_body = {
        "schemaVersion": "messages-v1",
        "messages": [
            {
                "role": "user",
                "content": [{"text": prompt}]
            }
        ],
        "system": [{"text": SYSTEM_PROMPT}],
        "inferenceConfig": {
            "maxTokens": max_tokens,
            "temperature": 0.1,
            "topP": 0.9
        }
    }

    response = bedrock_runtime.invoke_model(
        modelId=MODEL_ID,
        body=json.dumps(request_body),
        contentType="application/json",
        accept="application/json"
    )

    body = json.loads(response["body"].read())
    return body["output"]["message"]["content"][0]["text"]


def invoke_medical_coder(
    task: str,
    content: str,
    payer: Optional[str] = None,
    use_gateway: bool = False   # kept for API compatibility, ignored for now
) -> dict:
    """Invoke Nova 2 Lite for a specific coding task."""
    prompt = build_prompt(task, content, payer)
    result = _invoke(prompt, max_tokens=1024)
    return {"task": task, "result": result}


def invoke_full_coding_analysis(clinical_note: str, payer: Optional[str] = None) -> dict:
    """Full ICD-10 + CPT + payer policy analysis in one call."""
    combined_prompt = (
        f"Clinical Note:\n{clinical_note}\n\n"
        f"{'Payer: ' + payer + chr(10) if payer else ''}"
        "Perform a complete medical coding analysis:\n"
        "1. Assign all ICD-10-CM diagnosis codes\n"
        "2. Assign CPT procedure codes\n"
        "3. Flag any payer coverage or prior authorization requirements\n"
        "4. Provide rationale for each code assigned"
    )
    result = _invoke(combined_prompt, max_tokens=2048)
    return {"task": "full_analysis", "result": result}