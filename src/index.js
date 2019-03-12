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

    /// A queue of async ops on a target object.
    class Queue extends Array {

        constructor() {
            super();
        }

        /// Set the target object.
        set target( target ) {
            if( target ) {
                this._target = target;
                // Dispatch the target to queued operations.
                this.forEach( op => op( target ) );
                this.length = 0;
            }
        }

        /// Add an async op to the queue.
        add( op ) {
            // If the target is available then pass directly to the op.
            if( this._target ) {
                return op( this._target );
            }
            // Else queue the op and return a promise that will be resolved
            // when the op is invoked.
            return new Promise( resolve => {
                this.push( target => resolve( op( target ) ) );
            });
        }

    }

    /// A queue of message posts to the active service worker.
    const PostQueue = new Queue();

    /// Log function.
    function log( level, msg, ...args ) {
        args.unshift('[locomote] '+msg );
        console[level].apply( console, args );
    }

    window.onload = () => {
        // Attempt to register service worker.
        if( 'serviceWorker' in navigator ) {
            // Try to read service worker URL from meta tag in the page header.
            // Tag should be like: <link rel="locomote-service-worker" href="/sw.js" />
            const link = document.head.querySelector('link[rel~=locomote-service-worker]');
            const url = link && link.href;
            if( !url ) {
                log('debug','Service worker link not found');
                return;
            }
            log('debug','Registering service worker @ %s', url );
            const { serviceWorker } = navigator;
            serviceWorker.register( url )
                .then( registration => {
                    const { active } = registration;
                    if( active ) {
                        log('info', 'Service worker registered', registration );
                        PostQueue.target = active;
                    }
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
    async function unregister( ...scopes ) {
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
    }

    /**
     * List all available service workers.
     * @param info
     */
    async function list( info = 'scopes' ) {
        const { serviceWorker } = navigator;
        const registrations = await serviceWorker.getRegistrations()
        if( info == 'scopes' ) {
            return registrations.map( reg => reg.scope );
        }
        return registrations;
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
     * Refresh statically cached content.
     */
    function refreshStatics() {
        post({ name: 'refresh-statics' });
    }

    /**
     * Post a message to all registered service workers.
     */
    function post( message ) {
        return PostQueue.add( serviceWorker => {
            serviceWorker.postMessage( message );
        });
    }

    window.locomote = {
        list,
        isInstalled,
        refresh,
        refreshStatics,
        post
    };

})();

