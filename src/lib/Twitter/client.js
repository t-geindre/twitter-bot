import Ajax from '../ajax.js';

export default class
{
    constructor(baseUrl, headers = {})
    {
        this.headers = headers;
        this.baseUrl = baseUrl;
    }

    search(parameters = {})
    {
        return this.request({
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
        return this.request({
            url: 'statuses/show/' + tweetId + '.json',
            parameters
        });
    }

    user(screenName, parameters = {})
    {
        return this.request({
            url: 'users/show.json',
            parameters: Object.assign(
                { screen_name: screenName },
                parameters
            )
        });
    }

    request(options = {})
    {
        options.url = this.baseUrl + options.url;

        return Ajax(Object.assign(
            { headers: this.headers},
            options
        ));
    }
}
