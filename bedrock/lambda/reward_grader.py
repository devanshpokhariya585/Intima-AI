"""
Lambda Reward Grader for Medical Coding RFT
Bedrock sends a BATCH of samples — must return one score per input.
"""

import json
import re


def extract_codes(text: str) -> set:
    """Extract ICD-10 and CPT codes from model response."""
    icd10 = set(re.findall(r'\b[A-Z]\d{2}\.?\w{0,4}\b', text.upper()))
    cpt = set(re.findall(r'\b\d{5}\b', text))
    return icd10 | cpt


def compute_reward(predicted: set, reference: set) -> float:
    """F1 score between predicted and reference codes."""
    if not reference or not predicted:
        return 0.0

    matches = predicted.intersection(reference)
    precision = len(matches) / len(predicted)
    recall = len(matches) / len(reference)

    if precision + recall == 0:
        return 0.0

    f1 = 2 * (precision * recall) / (precision + recall)
    return round(f1, 4)


def score_single(model_response: str, reference_answer: str) -> float:
    """Score one model response against its reference."""
    predicted_codes = extract_codes(model_response)
    correct_codes = extract_codes(reference_answer)

    # Fallback: parse comma-separated if regex found nothing
    if not correct_codes and reference_answer:
        correct_codes = set(
            c.strip().upper()
            for c in reference_answer.replace(" ", "").split(",")
            if c.strip()
        )

    return compute_reward(predicted_codes, correct_codes)


def lambda_handler(event, context):
    """
    Bedrock RFT sends a batch — event is a LIST of inputs.
    Must return a list with one {"aggregate_reward_score": float} per input.
    """
    try:
        # event is a list of sample dicts
        if isinstance(event, list):
            inputs = event
        else:
            # Fallback: single sample wrapped in a list
            inputs = [event]

        results = []
        for sample in inputs:
            try:
                model_response  = sample.get("modelResponse", "")
                reference_answer = sample.get("referenceAnswer", {}).get("answer", "")
                reward = score_single(model_response, reference_answer)
            except Exception as e:
                print(f"Error scoring sample: {e}")
                reward = 0.0

            results.append({"aggregate_reward_score": reward})

        print(json.dumps({
            "batch_size": len(inputs),
            "scores": [r["aggregate_reward_score"] for r in results]
        }))

        return results

    except Exception as e:
        print(f"Grader fatal error: {str(e)}")
        # Return zero scores matching input count as best-effort
        count = len(event) if isinstance(event, list) else 1
        return [{"aggregate_reward_score": 0.0}] * count