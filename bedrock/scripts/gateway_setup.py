"""
AgentCore Gateway Setup — MCP Server Registration
Run this ONCE to create the Gateway and register your MCP servers.
After running, the Gateway ID is saved to gateway_config.json for use by app.py
"""

import boto3
import json
import os

# ─── CONFIG — update before running ─────────────────────────────────────────
AWS_REGION     = "us-east-1"
AWS_ACCOUNT_ID = "379264686925"
IAM_ROLE_ARN   = f"arn:aws:iam::{379264686925}:role/BedrockAgentCoreRole"

# Add your MCP server URLs here
MCP_SERVERS = [
    {
        "name": "ehr-mcp-server",
        "description": "Pulls live patient notes from EHR system",
        "url": "https://your-ehr-mcp-server.com/mcp"  # Replace with real URL
    },
    {
        "name": "cms-codes-mcp",
        "description": "Real-time ICD-10 and CPT code lookups from CMS",
        "url": "https://your-cms-mcp-server.com/mcp"  # Replace with real URL
    },
    {
        "name": "payer-policy-mcp",
        "description": "Live payer coverage and prior auth policy checks",
        "url": "https://your-payer-mcp-server.com/mcp"  # Replace with real URL
    }
]

CONFIG_OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "gateway_config.json")
# ─────────────────────────────────────────────────────────────────────────────

agentcore = boto3.client("bedrock-agentcore", region_name=AWS_REGION)


def create_gateway() -> str:
    print("Creating AgentCore Gateway...")

    response = agentcore.create_gateway(
        name="medical-coding-gateway",
        description="Unified MCP gateway for medical coding agent",
        roleArn=IAM_ROLE_ARN,
        protocolConfiguration={
            "serverProtocol": "MCP"
        }
    )

    gateway_id = response["gatewayId"]
    gateway_arn = response["gatewayArn"]
    print(f"✅ Gateway created: {gateway_id}")
    return gateway_id, gateway_arn


def register_mcp_servers(gateway_id: str) -> list:
    """Register each MCP server as a Gateway Target."""
    target_ids = []

    for server in MCP_SERVERS:
        print(f"  Registering: {server['name']}...")

        response = agentcore.create_gateway_target(
            gatewayIdentifier=gateway_id,
            name=server["name"],
            description=server["description"],
            targetConfiguration={
                "mcpServer": {
                    "serverConfig": {
                        "url": server["url"]
                    }
                }
            }
        )

        target_id = response["targetId"]
        target_ids.append(target_id)
        print(f"  ✅ Registered: {server['name']} → {target_id}")

    return target_ids


def sync_tools(gateway_id: str):
    """Sync tool discovery from all registered MCP servers."""
    print("Syncing tools from MCP servers...")
    agentcore.synchronize_gateway_targets(gatewayIdentifier=gateway_id)
    print("✅ Tools synchronized")


def save_config(gateway_id: str, gateway_arn: str, target_ids: list):
    config = {
        "gateway_id": gateway_id,
        "gateway_arn": gateway_arn,
        "target_ids": target_ids,
        "region": AWS_REGION
    }
    with open(CONFIG_OUTPUT_PATH, "w") as f:
        json.dump(config, f, indent=2)
    print(f"\n💾 Config saved to {CONFIG_OUTPUT_PATH}")
    print("Update GATEWAY_ID in invoke_model.py with the gateway_id above.")


if __name__ == "__main__":
    gateway_id, gateway_arn = create_gateway()
    target_ids = register_mcp_servers(gateway_id)
    sync_tools(gateway_id)
    save_config(gateway_id, gateway_arn, target_ids)

    print("\n🎉 Gateway setup complete!")
    print(f"Gateway ID: {gateway_id}")