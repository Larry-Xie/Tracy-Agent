# Tracy-Agent

The Agent of Tracy. An extension of Chrome.

## Build the files

* Run `npm run build`

## Generate crx file

* Run `npm install -g crx`

* Run `npm run build`

* Go to *dist* folder and run `crx pack -o '../crx/TA Agent.crx'`

## Debug mode

* Open Chrome

* Visit `chrome://extensions`

* Enable Developer mode

* Click `Load unpacked` and select the *dist* folder

## Publish extension

* Visit `https://chrome.google.com/webstore/devconsole/`

* Zip the *dist* folder

* Upload the `dist.zip` file
