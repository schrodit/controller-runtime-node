import {
    KubeClient,
    KubeClientReader,
    ObjectHeader,
    ObjectKind,
    WatchCallback,
    KubernetesObject,
    KubernetesEventType,
    WatchObject
} from "./KubeClient";
import {has} from "@0cfg/utils-common/lib/has";
import {NotFound} from "./KubernetesError";
import {V1Status} from "@kubernetes/client-node";

const groupVersionKindKey = (object: ObjectKind<any>): string => [object.apiVersion, object.kind].join('/');
const parseGroupVersionKind = (gvk: string): ObjectKind<any> => {
    const s = gvk.split('/');
    return {
        apiVersion: s[0],
        kind: s[1],
    }
};
const namespacedName = (object: ObjectHeader<any>): string => [object.metadata.namespace, object.metadata.name].join('/');

/**
 * Describes the Kubernetes status reason if an outdated resource version is used in the watch.
 */
const resourceVersionExpiredReason = 'Expired';

/**
 * Describes the Kubernetes status code if an outdated resource version is used in the watch.
 */
const resourceVersionExpiredCode = 410;

export interface Cache extends KubeClientReader {
    start(): void;
    addListener(object: ObjectKind<any>, cb: WatchCallback): void;
    waitForSync(): Promise<void>;
}

export class DefaultCache implements Cache {
    private listeners: {[gvk: string]: WatchCallback[]} = {};
    private cache: {
        [gvk: string]: {
            [namespacedName: string]: KubernetesObject,
        }
    } = {};
    private metadata: {
        [gvk: string]: {
            lastResourceVersion?: string,
            resourcePath: string,
        },
    } = {};
    private cacheSync?: Promise<void>;

    public constructor(
        private readonly client: KubeClient,
    ) {
    }

    public start(): void {
        this.cacheSync = this.startSync();
    }

    public addListener(object: ObjectKind<any>, cb: WatchCallback): void {
        if (has(this.cacheSync)) {
            throw new Error(`Cache already started. Listeners can only be added before tarting the cache`);
        }
        const gvk = groupVersionKindKey(object)
        if (!has(this.listeners[gvk])) {
            this.listeners[gvk] = [];
            this.cache[gvk] = {};
        }
        this.listeners[gvk].push(cb);
    }

    public async get<T extends KubernetesObject>(
        spec: T,
        pretty?: string,
        exact?: boolean,
        exportt?: boolean,
        options?: { headers: { [p: string]: string } }): Promise<void> {
        const gvk = groupVersionKindKey(spec);
        if (!has(this.cache[gvk] || !has(this.cache[gvk][namespacedName(spec)]))) {
            throw new NotFound();
        }
        Object.assign(spec, this.cache[gvk][namespacedName(spec)])
    }

    public waitForSync(): Promise<void> {
        return Promise.resolve(undefined);
    }

    private async startSync(): Promise<void> {
        await Promise.all(Object.keys(this.cache).map(gvk => this.startWatch(gvk)));

    }

    private async startWatch(gvk: string): Promise<void> {
        if (!has(this.metadata[gvk]) || has(this.metadata[gvk].lastResourceVersion)) {
            await this.initializeCache(gvk);
        }

        const req = await this.client.watch(this.metadata[gvk]!.resourcePath, {
            allowWatchBookmarks: false,
            resourceVersion: this.metadata[gvk]?.lastResourceVersion,
        }, (type: KubernetesEventType, apiObject: KubernetesObject, watchObject?: WatchObject) => {
                switch (type) {
                    case KubernetesEventType.ADDED:
                        this.recordObjectAdded(apiObject);
                        break;
                    case KubernetesEventType.MODIFIED:
                        this.recordObjectModified(apiObject);
                        break;
                    case KubernetesEventType.DELETED:
                        this.recordObjectDeleted(apiObject);
                        break;
                    case KubernetesEventType.ERROR:
                        const status = apiObject as V1Status;
                        if (status.code === resourceVersionExpiredCode
                            && status.reason === resourceVersionExpiredReason) {
                            this.metadata[gvk].lastResourceVersion = undefined;
                            req.abort();
                            return;
                        }
                        console.error(`Error during watch: Reason: ${status.reason} - ${status.message}`);
                        return;
                    default:
                        console.error(`Unknown kube watch event type: ${type}`);
                        return;
                }
                if (has(apiObject) && has(apiObject.metadata)) {
                    this.metadata[gvk].lastResourceVersion = apiObject.metadata?.resourceVersion;
                }

                this.listeners[gvk]
                    .forEach(l => l(type, apiObject, watchObject));
            },
            // "done" callback is called either when connection is closed or when there is an error.
            // eslint-disable-next-line  @typescript-eslint/no-explicit-any
            async (error: any) => {
                if (has(error)) {
                    const msg = (error instanceof Error) ? error.message : JSON.stringify(error);
                    if (msg !== 'aborted') { // The watch get request timeouts
                        console.error(`Kubernetes watch of ${gvk} disconnected: ${msg}`);
                    }
                }
                this.startWatch(gvk);
            },
        );
    }

    /**
     * lists all resources of the given object and adds them to the cache;
     */
    private async initializeCache(gvk: string): Promise<void> {
        const {apiVersion, kind} = parseGroupVersionKind(gvk);
        const list = await this.client.list<any>(apiVersion, kind);
        this.metadata[gvk] = {
            lastResourceVersion: list.metadata!.resourceVersion!,
            resourcePath: await this.client.getAPIResourcePath(apiVersion, kind),
        };

        list.items.forEach(o => {
            this.cache[groupVersionKindKey(o)] = {};
            this.recordObjectAdded(o);
        });
    }

    private recordObjectAdded(obj: KubernetesObject) {
        // todo: deep copy object
        this.cache[groupVersionKindKey(obj)][namespacedName(obj)] = obj;
    }

    private recordObjectModified(obj: KubernetesObject) {
        // todo: deep copy object
        this.cache[groupVersionKindKey(obj)][namespacedName(obj)] = obj;
    }

    private recordObjectDeleted(obj: KubernetesObject) {
        delete this.cache[groupVersionKindKey(obj)][namespacedName(obj)];
    }

}

