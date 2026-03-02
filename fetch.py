import requests

url = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzkwZTNkODM3MDAyMzQ2NjdiNTQ2MGU1ODRlNmQ0OWQ5EgsSBxDo9Mal2Q4YAZIBIwoKcHJvamVjdF9pZBIVQhMzMTk3OTk2NTMxODQ2NTk0MTM2&filename=&opi=89354086"
headers = {
    'User-Agent': 'Mozilla/5.0'
}

print("Downloading...")
try:
    response = requests.get(url, headers=headers, stream=True)
    response.raise_for_status()
    with open('stitch.html', 'w', encoding='utf-8') as f:
        f.write(response.text)
    print("Download successful!")
except Exception as e:
    print(f"Error downloading: {e}")
