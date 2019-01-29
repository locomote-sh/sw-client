// Copyright 2019 Locomote Limited
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

(function() {

    /// Log function.
    function log( level, msg, ...args ) {
        args.unshift('[locomote] '+msg );
        console[level].apply( console, args );
    }

    /// Function for executing API calls once service worker is loaded.
    const whenReady = function( fn ) {
        const { serviceWorker, queued } = whenReady;
        // If service worker available then execute api call immediately.
        if( serviceWorker ) {
            return fn( serviceWorker );
        }
        // Service worker not yet available, so return a promise which
        // queues the api call and resolves once the queue is processed.
        return new Promise( resolve => {
            queued.push( serviceWorker => {
                resolve( fn( serviceWorker ) );
            });
        });
    }
    whenReady.queued = [];

    window.onload = () => {
        // Attempt to register service worker.
        if( 'serviceWorker' in navigator ) {
            // Try to read service worker URL from meta tag in the page header.
            // Tag should be like: <meta name="locomote-service-worker-url" content="/sw.js" />
            let selector = 'meta[name~=locomote-service-worker-url]';
            let meta = document.head.querySelector( selector );
            let url = meta && meta.content;
            if( !url ) {
                return;
            }
            log('debug','Registering service worker @ %s', url );
            const { serviceWorker } = navigator;
            serviceWorker.register( url )
                .then( registration => {
                    log('info', 'Service worker registered', registration );
                    // Process pending queue.
                    const { active } = registration;
                    whenReady.serviceWorker = active;
                    whenReady.queued.forEach( p => p( active ) );
                    whenReady.queued = [];
                })
                .catch( e => log('error', 'Failed to register service worker', e ) );
            // Refresh the service worker's origins.
            refresh();
        }
        else log('info','Service workers not supported');
    };

    /**
     * Unregister one or more service workers.
     * @param scopes One or more service worker scope URLs.
     */
    function unregister( ...scopes ) {
        return whenReady( async () => {
            let count = 0;
            // See https://stackoverflow.com/a/33705250/8085849
            const { serviceWorker } = navigator;
            const registrations = await serviceWorker.getRegistrations()
            for( let registration of registrations ) {
                if( !scopes || scopes.some( scope => scope == registration.scope ) ) {
                    registration.unregister()
                    count++;
                }
            }
            log('info','Unregistered %s service worker%s', count, count > 1 ? 's' : '' );
        });
    }

    /**
     * List all available service workers.
     * @param info
     */
    function list( info = 'scopes' ) {
        return whenReady( async () => {
            const { serviceWorker } = navigator;
            const registrations = await serviceWorker.getRegistrations()
            if( info == 'scopes' ) {
                registrations = registrations.map( reg => reg.scope );
            }
            return registrations;
        });
    }

    function isInstalled() {
        // TODO
    }

    /**
     * Refresh a content origin.
     * @param origin    A content origin URL or path; or '*' to refresh all of a
     *                  service worker's origins. Defaults to '*'.
     * @param interval  An optional refresh interval. If provided then the content
     *                  origin is automatically refreshed every n minutes. If not
     *                  provided then the content origin is refreshed immediately.
     */
    function refresh( origin = '*', interval = 0 ) {
        if( interval ) {
            return window.setInterval( () => refresh( origin ), interval * 1000 * 60 );
        }
        post({ name: 'refresh', args: origin });
    }

    /**
     * Post a message to all registered service workers.
     */
    function post( message ) {
        return whenReady( serviceWorker => {
            serviceWorker.postMessage( message );
        });
    }

    window.locomote = {
        list,
        isInstalled,
        refresh,
        post
    };

})();

