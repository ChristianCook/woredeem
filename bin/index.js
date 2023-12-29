#!/usr/bin/env node

import CryptoJS from 'crypto-js';
import axiosRetry from 'axios-retry';
import axios from "axios";
import yargs from "yargs";
import chalk from "chalk";
import { promises as fs } from "fs";
import { parse } from 'ini';

const options = yargs
    .usage("Usage: woredeem GIFTCODE [GROUP] [SUBGROUP]\nRedeems GIFTCODE for all entries in ini file. Optionally specify GROUP/SUBGROUP to limit entries.")
    .option("i", { alias: "ini", describe: "INI file", type: "string", default: "data.ini" })
    .option("d", { alias: "delay", describe: "delay between requests in ms", type: "number", default: 100 })
    .demandCommand(1, 'Giftcode not specified')
    .argv;

axiosRetry(axios, { 
    retries: 3,
    retryDelay: (...arg) => axiosRetry.exponentialDelay(...arg, 10000),
    retryCondition(error) {
        return error.response.status === 429 ? true : false;
    },
    onRetry(retryCount) {
        if (retryCount === 1) {
            process.stdout.write('Too many requests. Retrying.');
        } else {
            process.stdout.write('.');
        }
    }
});

/**
 * Signs data
 * @param {*} obj 
 * @returns 
 */
const appendSign = obj => {
    var str = Object.keys(obj).sort().reduce(function(pre, cur) {
        return (pre ? pre + '&' : '') + cur + '=' + (typeof obj[cur] === 'object' ? JSON.stringify(obj[cur]) : obj[cur]);        
    }, '');

    return {
        sign: (0, CryptoJS.MD5)(str + 'tB87#kPtkxqOS2').toString((CryptoJS.enc.Hex)),
        ...obj
    };
}

/**
 * Get player info
 * @param {int} id 
 * @returns {object}
 */
const getPlayer = id => {
    const data = {
        fid: id,
        time: Date.now()    
    }

    return axios({
        method: 'post',
        url: 'https://wos-giftcode-api.centurygame.com/api/player',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded' 
        },
        data: new URLSearchParams(appendSign(data)).toString()
    }).then(res => {
        if (res.data.err_code === 40001) return false;
        else return res.data.data;    
    });
}

/**
 * Redeem code for player id
 * @param {int} id 
 * @param {string} code 
 * @returns {object}
 */

const redeemCode = (id, code) => {
    const data = {
        fid: id,
        cdk: code,
        time: Date.now()
    }

    return axios({
        method: 'post',
        url: 'https://wos-giftcode-api.centurygame.com/api/gift_code',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: new URLSearchParams(appendSign(data)).toString()
    }).then(res => {        
        if (res.data.err_code === 40014) {
            console.log(chalk.red.bold('[Failed] Gift Code not found!'));
            return false;
        } else if (res.data.err_code === 40007) {
            console.log(chalk.red.bold('[Failed] Expired, unable to claim.'));            
            return false;
        }
        return res.data;
    });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * MAIN
 * 
 */
const main = async() => {
    const w = 20; // Output column width
    let data;

    // Load csv file
    process.stdout.write(chalk.green.bold('Loading data file...' + ' '.repeat(w-6)));

    try {
        data = parse(await fs.readFile(options.ini, {
            encoding : 'utf-8'
        }));
    } catch (error) {
        console.log(chalk.red.bold('[Failed] Unable to open "' + options.ini + '"'));
        console.error(error);
        return;
    }
    console.log(chalk.green.bold('[OK]'));

    // Validate code
    process.stdout.write(chalk.green.bold('Validating gift code...' + ' '.repeat(w-9)));   

    await getPlayer( Object.values(Object.values(data)[0])[0] ); // Login as 1st ID
    if (!await redeemCode(Object.values(Object.values(data)[0])[0], options._[0])) return;    

    console.log(chalk.green.bold('[OK]'));

    for (let [key, value] of Object.entries(data)) {
        let avgLvl = 0, cnt = 0;

        if (options._[1] && options._[1].toString() !== key) continue;

        console.log(chalk.green.bold('\nProcessing ' + chalk.white(key) + ':'));
        console.log(chalk.bold('-'.repeat(w+30)));

        for (const [key, value2] of Object.entries(value)) {
            if (options._[2] && options._[2].toString() !== key) continue;
            console.log(key + ' - ' + value2.split(',').length + ' players');

            for (let id of value2.split(',')) {
                id = parseInt(id);
                process.stdout.write(chalk.blue(id) + ' ');

                // Get player info (and log them in)
                const player = await getPlayer( id ); // Login
                if (!player) {
                    console.log(' '.repeat(w+13 - id.toString().length) + chalk.red('[Invalid ID]'));
                    continue;
                }

                avgLvl += player.stove_lv;
                cnt++;
                
                process.stdout.cursorTo(9);
                process.stdout.write(
                    '[' + chalk.yellow(player.stove_lv) + '] ' +
                    chalk.white.bold(player.nickname) +
                    ' '.repeat(w - player.nickname.length)
                );

                // Redeem code
                const res = await redeemCode(id, options._[0]);

                console.log(
                    res.err_code === 40008 ? chalk.yellow('[Received]') : 
                    res.err_code === 20000 ? chalk.green('[OK]') : 
                    chalk.red('[Failed]')
                );
                
                await sleep(options.delay);
            }
        }

        console.log(
            chalk.bold('='.repeat(w+30)) + '\n' +
            chalk.bold(cnt) + ' members, average furnace level ' + chalk.yellow( +(avgLvl / cnt).toFixed(2) )
        );
    }
    
    return;
}

main();
// end..of..the..line..