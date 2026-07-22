import boto3

session = boto3.Session()
client = session.client("secretsmanager", region_name="eu-west-2")

resp = client.get_secret_value(SecretId="elevaiteprosecret")
print("Secret retrieved OK:", bool(resp.get("SecretString")))
