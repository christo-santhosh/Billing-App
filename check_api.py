import urllib.request
import json
import traceback

try:
    response = urllib.request.urlopen('http://127.0.0.1:8000/api/analytics/ward_wise_analysis/')
    data = response.read().decode('utf-8')
    print("STATUS:", response.status)
    print("DATA:")
    print(data)
except Exception as e:
    print("ERROR:")
    traceback.print_exc()
    if hasattr(e, 'read'):
        print(e.read().decode('utf-8'))
