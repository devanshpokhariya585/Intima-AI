"""
RFT Job Launcher — Amazon Bedrock
Kicks off Reinforcement Fine-Tuning for medical coding on Nova 2 Lite
Run this ONCE to start training. Monitor via AWS Console > Bedrock > Custom Models
"""

import boto3
import json
import time

# ─── CONFIG — update these before running ───────────────────────────────────
AWS_REGION         = "us-east-1"
AWS_ACCOUNT_ID     = "379264686925"
IAM_ROLE_ARN       = f"arn:aws:iam::{AWS_ACCOUNT_ID}:role/BedrockRFTRole"
S3_BUCKET          = "your-medical-coding-bucket1"
LAMBDA_GRADER_ARN  = f"arn:aws:lambda:{AWS_REGION}:{AWS_ACCOUNT_ID}:function:medical-code-grader"
JOB_NAME           = "medical-coding-rft-job-v3"
CUSTOM_MODEL_NAME  = "nova-medical-coder-v1"
# ────────────────────────────────────────────────────────────────────────────

BASE_MODEL_ID = (
    "arn:aws:bedrock:us-east-1::foundation-model/"
    "amazon.nova-2-lite-v1:0:256k"
)

bedrock = boto3.client("bedrock", region_name=AWS_REGION)


def create_rft_job():
    print(f"Launching RFT job: {JOB_NAME}")

    response = bedrock.create_model_customization_job(
        jobName=JOB_NAME,
        customModelName=CUSTOM_MODEL_NAME,
        roleArn=IAM_ROLE_ARN,
        baseModelIdentifier=BASE_MODEL_ID,
        customizationType="REINFORCEMENT_FINE_TUNING",
        trainingDataConfig={
            "s3Uri": f"s3://{S3_BUCKET}/training/train.jsonl"
        },
        outputDataConfig={
            "s3Uri": f"s3://{S3_BUCKET}/rft-output/"
        },
        customizationConfig={
            "rftConfig": {
                "graderConfig": {
                    "lambdaGrader": {
                        "lambdaArn": LAMBDA_GRADER_ARN
                    }
                },
                "hyperParameters": {
                    "batchSize": 16,
                    "epochCount": 1,
                    "evalInterval": 10,
                    "inferenceMaxTokens": 8192,
                    "learningRate": 0.00001,
                    "maxPromptLength": 4096,
                    "reasoningEffort": "low",
                    "trainingSamplePerPrompt": 2
                }
            }
        }
    )

    job_arn = response["jobArn"]
    print(f"✅ Job started: {job_arn}")
    return job_arn


def poll_job_status(job_name: str, interval: int = 120):
    """Poll and print job status until completion."""
    print(f"\nPolling job status every {interval}s...")

    terminal_states = {"Completed", "Failed", "Stopped"}

    while True:
        job = bedrock.get_model_customization_job(jobIdentifier=job_name)
        status = job["status"]
        print(f"[{time.strftime('%H:%M:%S')}] Status: {status}")

        if status in terminal_states:
            if status == "Completed":
                custom_model_arn = job.get("outputModelArn", "")
                print(f"\n🎉 Training complete!")
                print(f"Custom Model ARN: {custom_model_arn}")
                print(f"\nSave this ARN in your invoke_model.py CUSTOM_MODEL_ARN variable.")
                return custom_model_arn
            else:
                print(f"\n❌ Job ended with status: {status}")
                print(json.dumps(job.get("failureMessage", "No details"), indent=2))
                return None

        time.sleep(interval)


if __name__ == "__main__":
    job_arn = create_rft_job()
    if job_arn:
        poll_job_status(JOB_NAME)