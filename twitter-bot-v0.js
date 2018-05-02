(function() {
    // ==============================================================
    // CONFIG / Define account list
    // ==============================================================

    let config = {
        accounts: ['contest_seeker'],
        contest: {
            search: 'rt follow gagner',
            pollInterval: 10000,
            requirements: {
                followers: 3500,
                retweets: 100,
                newerThan: 15, // days
            },
        },
        api: {
            baseUrl: 'https://api.twitter.com/1.1/',
            pauseDurationOnError: 600000,
        },
    };

    // FIX THE FUCKING CSRF THING

    // ==============================================================
    // UTILS
    // ==============================================================

    function getCookie(name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for(var i=0;i < ca.length;i++) {
            var c = ca[i];
            while (c.charAt(0)==' ') c = c.substring(1,c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
        }
        return null;
    }

    // ==============================================================
    // API CLIENT
    // ==============================================================

    class TwitterClient
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

    // ==============================================================
    // APP
    // ==============================================================

    class App
    {
        constructor(config, options)
        {
            this.config = config;
            this.options = options;
            this.handelingTweets = [];
            this.errorCount = 0;

            this
                .interceptApiHeaders()
                .then(
                    headers => this.client = new TwitterClient(
                        this.config.api.baseUrl,
                        new Proxy(headers, {
                            get: (target, key) => key == 'x-csrf-token' ? getCookie('ct0') : target[key],
                            set: (target, key, value) => target[key] = value,
                        })
                    )
                )
                .then(
                    () => this.setupSearchPolling()
                )
            ;
        }

        handleContestTweets(tweets)
        {
            tweets
                // get original tweet
                .map(tweet => tweet.retweeted_status ? tweet.retweeted_status : tweet)
                // check requirements
                .filter(tweet => (
                    tweet.user.followers_count > this.config.contest.requirements.followers
                    && tweet.retweet_count > this.config.contest.requirements.retweets
                    && (
                        (new Date()).getTime() - (new Date(tweet.created_at)).getTime()
                    ) / 86400 / 1000 <= this.config.contest.requirements.newerThan
                ))
                // remove duplicates
                .filter(tweet => {
                    if (this.handelingTweets.indexOf(tweet.id) === -1) {
                        this.handelingTweets.push(tweet.id)
                        return true;
                    }
                    return false;
                })
                // RT + follow
                .map(tweet => {
                    this.client.show(tweet.id_str)
                        .then(response => response.data)
                        .then(tweet => Promise
                            .all(tweet.entities.user_mentions.map(
                                user => this.client.follow(user.id_str)
                            ))
                            .then(() => tweet)
                        )
                        .then(tweet => Promise.all(
                            [
                                !tweet.user.following ? this.client.follow(tweet.user.id_str) : false,
                                !tweet.favorited ? this.client.favorite(tweet.id_str) : tweet,
                                !tweet.retweeted ? this.client.retweet(tweet.id_str) : tweet,
                            ]
                            .filter(item => !!item)
                        ))
                        .then(() => this.errorCount = 0)
                        .catch(response => {
                            if (response.status && response.status == 403) {
                                this.errorCount++;
                                this.pauseSearchPolling();
                            }
                        })
                })
            ;
        }

        pauseSearchPolling()
        {
            if (this.searchPollingId) {
                clearInterval(this.searchPollingId);
                setTimeout(
                    () => this.setupSearchPolling(),
                    this.config.api.pauseDurationOnError * this.errorCount
                );
            }
            this.searchPollingId = false;
        }

        setupSearchPolling()
        {
            let since_id = null;
            let pollFunc = () => {
                this.client.search({
                    q: this.config.contest.search,
                    result_type: 'mixed',
                    count: 100,
                    include_entities: 1,
                    since_id,
                }).then(response => {
                    since_id = response.data.search_metadata.max_id_str;
                    this.handleContestTweets(response.data.statuses);
                });
            };

            this.searchPollingId = setInterval(pollFunc, this.config.contest.pollInterval);
            pollFunc();
        }

        interceptApiHeaders()
        {
            return new Promise((resolv, reject) => {
                let
                    oldOpen = XMLHttpRequest.prototype.open,
                    oldSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader,
                    oldSend = XMLHttpRequest.prototype.send,
                    app = this
                ;

                XMLHttpRequest.prototype.open = function(method, url) {
                    if (url.substr(0, app.config.api.baseUrl.length) === app.config.api.baseUrl) {
                        this.xHeadersLog = {};
                    }

                    return oldOpen.apply(this, arguments);
                }

                XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
                    if (this.xHeadersLog) {
                        this.xHeadersLog[header] = value;
                    }

                    return oldSetRequestHeader.apply(this, arguments);
                }

                XMLHttpRequest.prototype.send = function() {
                    if (this.xHeadersLog) {
                        XMLHttpRequest.prototype.open = oldOpen;
                        XMLHttpRequest.prototype.send = oldSend;
                        XMLHttpRequest.prototype.setRequestHeader = oldSetRequestHeader;
                        resolv(this.xHeadersLog);
                    }

                    return oldSend.apply(this, arguments);
                }
            });
        }
    }

    // ==============================================================
    // INIT
    // ==============================================================

    let optionsContainer = window.document.querySelector('#init-data');
    if (!optionsContainer) {
        return;
    }

    let options = JSON.parse(optionsContainer.value);
    if (!!options.loggedIn
        && config.accounts.indexOf(options.screenName) > -1
    ) {
        console.warn('CONTEST SEEKER BOT START');
        new App(config, options);
    }
})();
