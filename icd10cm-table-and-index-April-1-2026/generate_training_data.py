"""
Synthetic Training Data Generator — Medical Coding RFT
Reads icd10cm-codes-April-1-2026.txt and generates clinical note → ICD-10 code
pairs using Claude via Amazon Bedrock. Outputs a train.jsonl file ready for RFT.

Usage:
    python generate_training_data.py

Output:
    train.jsonl  (in the same directory)

Requirements:
    pip install boto3
"""

import boto3
import json
import random
import time
import re
import os
from typing import Optional

# ─── CONFIG ──────────────────────────────────────────────────────────────────
CODES_FILE      = "icd10cm-codes-April-1-2026.txt"   # path to your txt file
OUTPUT_FILE     = "train.jsonl"
AWS_REGION      = "us-east-1"
MODEL_ID        = "amazon.nova-lite-v1:0"          # cross-region inference profile format

SAMPLES_TO_GENERATE = 500   # Start with 500, increase later if needed
CODES_PER_SAMPLE    = 3     # How many codes per generated clinical note (multi-code is realistic)
DELAY_BETWEEN_CALLS = 0.5   # Seconds between API calls (avoid throttling)

# Focus on these high-value categories for a medical coding agent
# (subset of codes most common in real clinical settings)
PRIORITY_PREFIXES = [
    "E",   # Endocrine/diabetes
    "I",   # Circulatory/heart
    "J",   # Respiratory
    "K",   # Digestive
    "M",   # Musculoskeletal
    "N",   # Genitourinary/renal
    "F",   # Mental health
    "G",   # Nervous system
    "C",   # Neoplasms/cancer
    "Z",   # Factors influencing health
]
# ─────────────────────────────────────────────────────────────────────────────

bedrock = boto3.client("bedrock-runtime", region_name=AWS_REGION)


def parse_codes_file(filepath: str) -> dict:
    """
    Parse icd10cm-codes-April-1-2026.txt into {code: description} dict.
    Format: positions 1-7 = code (padded), position 9 onward = description
    """
    codes = {}
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            line = line.rstrip("\r\n")
            if not line.strip():
                continue
            # Code is left-aligned, description starts after whitespace
            parts = line.split(None, 1)
            if len(parts) == 2:
                code, description = parts
                codes[code.strip()] = description.strip()
    print(f"✅ Loaded {len(codes):,} ICD-10 codes")
    return codes


def filter_priority_codes(codes: dict) -> dict:
    """Keep only priority category codes for focused training."""
    filtered = {
        code: desc for code, desc in codes.items()
        if any(code.startswith(p) for p in PRIORITY_PREFIXES)
    }
    print(f"✅ Filtered to {len(filtered):,} priority codes")
    return filtered


def generate_clinical_note(code_descriptions: list[tuple]) -> Optional[str]:
    """
    Call Bedrock to generate a realistic clinical note for the given codes.
    code_descriptions: list of (code, description) tuples
    """
    codes_text = "\n".join(
        f"- {code}: {desc}" for code, desc in code_descriptions
    )

    prompt = f"""You are a medical documentation expert. Generate a realistic, concise clinical note (2-4 sentences) for a patient that would result in ALL of the following ICD-10 diagnosis codes being assigned:

{codes_text}

Rules:
- Write ONLY the clinical note, no preamble or explanation
- Make it sound like a real physician's note
- Include relevant symptoms, history, and findings that justify each code
- Do not mention the ICD-10 codes themselves in the note
- Keep it under 150 words

Clinical note:"""

    try:
        response = bedrock.invoke_model(
            modelId=MODEL_ID,
            body=json.dumps({
                "schemaVersion": "messages-v1",
                "messages": [
                    {
                        "role": "user",
                        "content": [{"text": prompt}]
                    }
                ],
                "inferenceConfig": {
                    "maxTokens": 300,
                    "temperature": 0.8,
                    "topP": 0.95
                }
            }),
            contentType="application/json",
            accept="application/json"
        )
        body = json.loads(response["body"].read())
        return body["output"]["message"]["content"][0]["text"].strip()

    except Exception as e:
        print(f"  ⚠️  API error: {e}")
        return None


def build_training_example(clinical_note: str, codes: list[tuple]) -> dict:
    """
    Build one JSONL training example in Bedrock RFT format.
    """
    code_list = ", ".join(code for code, _ in codes)
    return {
        "messages": [
            {
                "role": "user",
                "content": (
                    f"Clinical note:\n{clinical_note}\n\n"
                    "Assign all applicable ICD-10-CM diagnosis codes."
                )
            }
        ],
        "reference_answer": {
            "answer": code_list
        },
        "data_source": "synthetic_icd10"
    }


def main():
    # 1. Load and filter codes
    if not os.path.exists(CODES_FILE):
        print(f"❌ File not found: {CODES_FILE}")
        print(f"   Make sure {CODES_FILE} is in the same directory as this script.")
        return

    all_codes = parse_codes_file(CODES_FILE)
    priority_codes = filter_priority_codes(all_codes)
    code_items = list(priority_codes.items())

    # 2. Generate samples
    print(f"\n🚀 Generating {SAMPLES_TO_GENERATE} training samples...")
    print(f"   Using {CODES_PER_SAMPLE} codes per sample\n")

    examples = []
    failed = 0

    for i in range(SAMPLES_TO_GENERATE):
        # Pick random codes for this sample
        selected = random.sample(code_items, min(CODES_PER_SAMPLE, len(code_items)))

        print(f"[{i+1:>4}/{SAMPLES_TO_GENERATE}] Codes: {', '.join(c for c,_ in selected)}", end=" ... ")

        # Generate clinical note
        note = generate_clinical_note(selected)

        if note:
            example = build_training_example(note, selected)
            examples.append(example)
            print("✅")
        else:
            failed += 1
            print("❌ skipped")

        # Avoid throttling
        time.sleep(DELAY_BETWEEN_CALLS)

        # Save progress every 50 samples
        if (i + 1) % 50 == 0:
            _write_jsonl(examples, OUTPUT_FILE)
            print(f"\n   💾 Progress saved: {len(examples)} examples so far\n")

    # 3. Final save
    _write_jsonl(examples, OUTPUT_FILE)

    print(f"\n{'='*50}")
    print(f"✅ Done!")
    print(f"   Generated : {len(examples)} examples")
    print(f"   Failed    : {failed}")
    print(f"   Output    : {OUTPUT_FILE}")
    print(f"\nNext step: upload to S3")
    print(f"  aws s3 cp {OUTPUT_FILE} s3://YOUR_BUCKET_NAME/training/train.jsonl")


def _write_jsonl(examples: list, filepath: str):
    with open(filepath, "w", encoding="utf-8") as f:
        for ex in examples:
            f.write(json.dumps(ex) + "\n")


if __name__ == "__main__":
    main()