import boto3
import json
import subprocess
import os

REGION = "eu-west-2"
CONTAINER_NAME = "openai"
IMAGE_NAME = "openai"  # or whatever you actually use

def get_temp_credentials():
    session = boto3.Session()
    # If the current session already has temporary credentials (for example
    # the EC2 instance profile provides session credentials via IMDS), do
    # NOT call STS GetSessionToken (that API cannot be called using session
    # credentials). Instead reuse the existing session credentials.
    creds = session.get_credentials()
    # get_frozen_credentials exists on RefreshableCredentials in some boto3
    # versions; fall back to the object itself when absent.
    frozen = getattr(creds, "get_frozen_credentials", lambda: creds)()

    if getattr(frozen, "token", None):
        return {
            "AWS_ACCESS_KEY_ID": frozen.access_key,
            "AWS_SECRET_ACCESS_KEY": frozen.secret_key,
            "AWS_SESSION_TOKEN": frozen.token,
        }

    # Otherwise we have long-lived credentials and can request a session
    # token from STS.
    sts = session.client("sts", region_name=REGION)
    resp = sts.get_session_token(DurationSeconds=3600)  # 1 hour
    creds = resp["Credentials"]
    return {
        "AWS_ACCESS_KEY_ID": creds["AccessKeyId"],
        "AWS_SECRET_ACCESS_KEY": creds["SecretAccessKey"],
        "AWS_SESSION_TOKEN": creds["SessionToken"],
    }

def start_container_with_creds(creds):
    env_args = []
    for k, v in creds.items():
        env_args.extend(["-e", f"{k}={v}"])

    cmd = [
        "docker", "run",
        "--name", CONTAINER_NAME,
        # attach to your existing network
        "--network", "elevaitepro",
    ] + env_args + [
        IMAGE_NAME
    ]

    print("Running:", " ".join(cmd))
    subprocess.check_call(cmd)

if __name__ == "__main__":
    creds = get_temp_credentials()
    print("Got temporary credentials")
    start_container_with_creds(creds)