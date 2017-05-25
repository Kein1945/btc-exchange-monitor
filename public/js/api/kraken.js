(function(root){
    const API_URL = 'https://api.kraken.com';

    function getMessageSignature(path, request, nonce, secretKey) {
        var message = http_build_query(request)
		var secret	= atob(secretKey);
        // var hash	= new crypto.createHash('sha256');
		// var hmac	= new crypto.createHmac('sha512', secret);
        //
		// var hash_digest	= hash.update(nonce + message).digest('binary');
		// var hmac_digest	= hmac.update(path + hash_digest, 'binary').digest('base64');
        //
		// return hmac_digest;
		var hash	= new jsSHA('SHA-256', 'BYTES');
        hash.update(nonce + message)
        var hash_digest	= hash.getHash('BYTES');

		var hmac	= new jsSHA("SHA-512", "BYTES");
        hmac.setHMACKey(secret, 'BYTES');
        hmac.update(path + hash_digest)
        var hmac_digest	= hmac.getHMAC('B64');


        return hmac_digest;
	}

    const KRAKEN_API = function(apiKey, secretKey, options) {
        let nonce = options.nonce || 1;
        nonce = (new Date()).getTime() * 1000;

        function call_api(method, payload = {}, callback) {
            let request = {
                nonce,
            }

            chrome.storage.sync.set({
                krakenOptions: {
                    nonce: nonce
                }
            })


            const path = `/0/private/${method}`
            const url = `${API_URL}${path}`;

            return fetch(url, {
                method: 'POST',
                headers: {
                    'API-Key': apiKey,
                    'API-Sign': getMessageSignature(path, request, nonce, secretKey ),
                    'Content-type': 'application/x-www-form-urlencoded;charset=UTF-8'
                },
                body: http_build_query(request),
            }).then(function(response) {
                return response.json();
            })
        }
        const get_balance = function(callback){
            call_api('Balance', {}).then(function(response) {
                const { error } = response;
                if(!error) {
                    console.warn('Kraken', 'Balance', error);
                    chrome.storage.sync.set({
                        krakenOptions: {
                            nonce: nonce+100
                        }
                    })
                    return callback({ error: response, message: response.error })
                }
                const { result: funds } = response;

                let my_currencies = [];
                for(currency_name in funds) {
                    if(funds[currency_name] != 0) {
                        my_currencies.push(currency_name)
                    }
                }
                let balance = {
                    total: {
                        btc: 0,
                        usd: 0,
                    }
                }
                get_currencies_prices(my_currencies).then(function(response) {
                    response = response.result;
                    my_currencies.forEach(function(currency) {
                        const amount = parseFloat(funds[currency]);
                        balance[currency] = {
                            btc: 0, usd: 0,
                            [currency]: amount,
                            name: map_currencies[currency],
                        };


                        if(currency !== 'XXBT'){
                            const name = get_pair_name(currency, 'XXBT');
                            const price = parseFloat(response[name].c[0]);
                            balance[currency].btc = price * amount
                            balance.total.btc += balance[currency].btc


                            const usdbtc = get_pair_name('XXBT', 'ZUSD')
                            const usd_price = parseFloat(response[usdbtc].c[0]);
                            balance[currency].usd = usd_price * (price * amount)
                            balance.total.usd += usd_price * (price * amount);
                        } else {
                            balance[currency].btc = amount
                            balance.total.btc += amount;
                        }
                    })
                    callback(balance)
                })
            })
        }

        function get_pair_name(currency, main_currency) {
            return `${currency}${main_currency}`
        }

        var map_currencies = {}

        function get_currencies_prices(currencies) {
            return fetch('https://api.kraken.com/0/public/Assets').then(function(response){
                return response.json();
            }).then(function({result}){
                // response.result
                // console.log(response)
                for(ex_currency_name in result) {
                    map_currencies[ex_currency_name] = result[ex_currency_name].altname;
                }
                let query = [];
                currencies.forEach(function(currency) {
                    if(currency !== 'XXBT') {
                        query.push(get_pair_name(currency, 'XXBT'))
                    }
                })
                query.push(get_pair_name('XXBT', 'ZUSD'))
                return fetch(`https://api.kraken.com/0/public/Ticker?pair=${_.uniq(query).join(',')}`).
                    then(function(response){
                        return response.json();
                    })
            })

        }

        return {
            call_api,
            get_balance,
        }
    }
    root['kraken_api'] = KRAKEN_API;
})(window)
