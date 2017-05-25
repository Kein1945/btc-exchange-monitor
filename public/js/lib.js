function getHMACSecret(msg, secretKey) {
    let shaObj = new jsSHA("SHA-512", "TEXT");
    shaObj.setHMACKey(secretKey, "TEXT");
    shaObj.update(msg);
    return shaObj.getHMAC("HEX");
}

function http_build_query( formdata, numeric_prefix, arg_separator ) {	// Generate URL-encoded query string
	//
	// +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
	// +   improved by: Legaev Andrey
	// +   improved by: Michael White (http://crestidg.com)

	var key, use_val, use_key, i = 0, tmp_arr = [];

	if(!arg_separator){
		arg_separator = '&';
	}

	for(key in formdata){
		use_key = escape(key);
		use_val = escape((formdata[key].toString()));
		use_val = use_val.replace(/%20/g, '+');

		if(numeric_prefix && !isNaN(key)){
			use_key = numeric_prefix + i;
		}
		tmp_arr[i] = use_key + '=' + use_val;
		i++;
	}

	return tmp_arr.join(arg_separator);
}
