from flask import Flask, request
import requests
import json
import os

app = Flask(__name__)

adress = 'http://api.nbp.pl/api/exchangerates/rates/a/chf/?format=json'

location = os.path.abspath( os.path.dirname( __file__ ) )

@app.route('/api/', methods = ['POST'])
def index():
    print(request.get_json())
    r = requests.get(adress)
    return r.json()

@app.route('/api/echo', methods = ['POST'])
def mockSetter():
    return request.get_json()

if __name__ == '__main__':
    app.run(debug=True)