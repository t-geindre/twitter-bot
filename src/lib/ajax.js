var Ajax = class
{
    constructor(options)
    {
        this.xhr = null;
        this.options = Object.assign({
            method: 'GET',
            headers: this.headers,
            url: ''
        }, options);
    }

    getUrl()
    {
        let url = this.options.url;

        if (this.options.parameters) {
            let query = Object.keys(this.options.parameters)
                .filter(k => (
                    this.options.parameters[k] !== undefined
                    && this.options.parameters[k] !== null
                    && this.options.parameters[k] !== ''
                ))
                .map(k => (
                    encodeURIComponent(k)
                    + '='
                    + encodeURIComponent(this.options.parameters[k])
                ))
                .join('&')
                .trim()
            ;

            url += query.length > 0 ? '?' + query : '';
        }

        return url;
    }

    send()
    {
        return new Promise((resolv, reject) =>
        {
            this.xhr = new XMLHttpRequest();
            this.xhr.open(
                this.options.method,
                this.getUrl(),
                true
            );

            Object.keys(this.options.headers).map(
                key => this.xhr.setRequestHeader(
                    key,
                    this.options.headers[key]
                )
            );

            this.xhr.withCredentials = true;
            if (this.options.withCredentials !== undefined) {
                this.xhr.withCredentials = this.options.withCredentials;
            }

            this.xhr.onreadystatechange = (event) =>
                this.handleStateChange(event, resolv, reject)
            ;

            this.xhr.send();
        });
    }

    handleStateChange(event, resolv, reject)
    {
        if (this.xhr.readyState === XMLHttpRequest.DONE) {
            let response = {
                text: this.xhr.responseText,
                status: this.xhr.status,
            };

            Object.defineProperty(response, 'json', {
                get : () => JSON.parse(this.xhr.responseText)
            });

            if (this.xhr.status >= 200 && this.xhr.status < 300) {
                resolv(response);

                return;
            }

            reject(response);
        }
    }
}

export default (options) => (new Ajax(options)).send();
