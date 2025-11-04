import requests
import time

headers = {
    'Content-Type': 'application/json',
}

json_data = {
    'to': '919163827035@s.whatsapp.net',
    'message': 'Damn boi',
}

# Number of messages to send
num_messages = 10  # Adjust as needed for testing

# Delay between messages in seconds (to avoid rate limiting)
delay = 1

for i in range(num_messages):
    response = requests.post('http://127.0.0.1:3000/message/send', headers=headers, json=json_data)
    print(f"Sent message {i+1}: {response.status_code}")
    time.sleep(delay)