# Whiteout Survival Gift Code Redeemer

## Install

1. Run `git clone https://github.com/ChristianCook/woredeem` to clone this repository.
2. Run `npm install` to install dependencies.
3. Optionally run `npm install -g` to install the `woredeem` executable globally.

## Usage

`woredeem GIFTCODE [GROUP] [SUBGROUP]`

Redeems GIFTCODE for all entries in ini file. Optionally specify GROUP/SUBGROUP
to limit entries.

<pre>
Options:
  --help       Show help                                               [boolean]
  --version    Show version number                                     [boolean]
  -i, --ini    INI file                           [string] [default: "data.ini"]
  -d, --delay  delay between requests in ms              [number] [default: 100]
</pre>

## INI example
```
[My alliance]
; A comment
R1=ID,ID,ID
R2=ID,ID,ID

[Alliance 2]
Group1=ID,ID,ID
```