export default {
    accounts: [''],
    contest: {
        search: 'rt follow gagner',
        pollInterval: 10000,
        requirements: {
            followers: 5000,
            retweets: 100,
            newerThan: 15, // days
        },
    },
    api: {
        baseUrl: 'https://api.twitter.com/1.1/',
        pauseDurationOnError: 600000,
    },
}
