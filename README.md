# Link Cleaner

A Microsoft Edge extension that strips tracking parameters from URLs.

**Before:**
```
https://jobs.rbc.com/ca/en/job/RBCAA0088R0000155752EXTERNALENCA/Strategic-Risk-Insights-Analyst?utm_source=LinkedIn&utm_medium=phenom-feeds&utm_campaign=rbc_linkedin
```

**After:**
```
https://jobs.rbc.com/ca/en/job/RBCAA0088R0000155752EXTERNALENCA/Strategic-Risk-Insights-Analyst
```

## What it removes

`utm_source` `utm_medium` `utm_campaign` `utm_term` `utm_content` `fbclid` `gclid` `gclsrc` `msclkid` `mc_cid` `mc_eid` `_ga` `_gl` `igshid` `si` `twclid` `ttclid` `dclid` and 30+ more.

## Install

1. Clone or download this repo
2. Open `edge://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** and select the `link-cleaner` folder

## Usage

- Parameters are stripped automatically as you browse
- Click the extension icon to toggle on/off
- Badge on the icon shows how many params were removed
- Right-click any link or page and select **Copy clean URL**
