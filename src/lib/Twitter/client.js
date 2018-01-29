export default class
{
    constructor(baseUrl, headers = {})
    {
        this.headers = headers;
        this.baseUrl = baseUrl;
    }

    search(parameters = {})
    {
        return this.jsonRequest({
            url: 'search/tweets.json',
            parameters
        });
    }

    follow(userId, parameters = { follow: true })
    {
        return this.request({
            method: 'POST',
            url: 'friendships/create.json',
            parameters: Object.assign(
                { user_id: userId },
                parameters
            )
        });
    }

    favorite(tweetId, parameters = {})
    {
        return this.request({
            method: 'POST',
            url: 'favorites/create.json',
            parameters: Object.assign(
                { id: tweetId },
                parameters
            )
        });
    }

    retweet(tweetId, parameters = {}) {
        return this.request({
            method: 'POST',
            url: 'statuses/retweet/' + tweetId + '.json',
            parameters,
        });
    }

    show(tweetId, parameters = {})
    {
        return this.jsonRequest({
            url: 'statuses/show/' + tweetId + '.json',
            parameters
        });
    }

    user(screenName, parameters = {})
    {
        return this.jsonRequest({
            url: 'users/show.json',
            parameters: Object.assign(
                { screen_name: screenName },
                parameters
            )
        });
    }

    request(options = {})
    {
        return new Promise((resolv, reject) => {
            options = Object.assign({
                method: 'GET',
                headers: this.headers,
                url: ''
            }, options);

            let url = this.baseUrl + options.url;
            if (options.parameters) {
                let query = Object.keys(options.parameters)
                    .filter(k => (
                        options.parameters[k] !== undefined
                        && options.parameters[k] !== null
                        && options.parameters[k] !== ''
                    ))
                    .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(options.parameters[k]))
                    .join('&')
                    .trim()
                ;

                url += query.length > 0 ? '?' + query : '';
            }

            let xhr = new XMLHttpRequest();
            xhr.open(options.method, url, true);

            Object.keys(options.headers).map(
                k => xhr.setRequestHeader(k, options.headers[k])
            );

            xhr.withCredentials = true;

            xhr.onreadystatechange = function(event) {
                if (this.readyState === XMLHttpRequest.DONE) {
                    let response = {
                        data: this.responseText,
                        status: this.status
                    };

                    if (this.status >= 200 && this.status < 300) {
                        resolv(response);

                        return;
                    }

                    reject(response);
                }
            };

            xhr.send();
        });
    }

    jsonRequest(options = {})
    {
        return this
            .request(options)
            .then(response => {
                response.data = JSON.parse(response.data);

                return response;
            })
    }
}
