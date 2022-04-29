import {URL} from 'url';
import {
    KubeConfig,
    KubernetesListObject,
    KubernetesObjectApi,
    RequestResult,
    V1DeleteOptions,
    V1Status,
    Watch,
} from '@kubernetes/client-node';
import {has} from '@0cfg/utils-common/lib/has';
import {KubeClient, KubernetesObject, KubernetesResponse, WatchCallback} from './KubeClient';


export class DefaultKubeClient implements KubeClient {
    private api: KubernetesObjectApiWrapper;
    private watcher: Watch;

    public constructor(kubeConfig: KubeConfig) {
        const cluster = kubeConfig.getCurrentCluster();
        if (!has(cluster)) {
            throw new Error('No active cluster defined');
        }
        this.api = new KubernetesObjectApiWrapper(cluster.server);
        this.api.setDefaultAuthentication(kubeConfig);
        this.api.setDefaultNamespace(kubeConfig);
        this.watcher = new Watch(kubeConfig);
    }

    public async create<T extends KubernetesObject>(
        spec: T,
        pretty?: string,
        dryRun?: string,
        fieldManager?: string,
        options?: { headers: { [name: string]: string } }
    ): Promise<void> {
        const res = await this.api.create(spec, pretty, dryRun, fieldManager, options) as KubernetesResponse<T>;
        Object.assign(spec, res.body);
    }

    public async delete<T extends KubernetesObject>(
        spec: T,
        pretty?: string,
        dryRun?: string,
        gracePeriodSeconds?: number,
        orphanDependents?: boolean,
        propagationPolicy?: string,
        body?: V1DeleteOptions,
        options?: { headers: { [name: string]: string } },
    ): Promise<V1Status> {
        return (await this.api.delete(
            spec,
            pretty,
            dryRun,
            gracePeriodSeconds,
            orphanDependents,
            propagationPolicy,
            body,
            options,
        )).body;
    }

    public async get<T extends KubernetesObject>(
        spec: T,
        pretty?: string,
        exact?: boolean,
        exportt?: boolean,
        options?: { headers: { [name: string]: string } }
    ): Promise<void> {
        const res = await this.api.read(spec, pretty, exact, exportt, options) as KubernetesResponse<T>;
        Object.assign(spec, res.body);
    }

    public async list<T extends KubernetesObject>(
        apiVersion: string,
        kind: string,
        namespace?: string,
        pretty?: string,
        exact?: boolean,
        exportt?: boolean,
        fieldSelector?: string,
        labelSelector?: string,
        limit?: number,
        continueToken?: string,
        options?: { headers: { [name: string]: string } }
    ): Promise<KubernetesListObject<T>> {
        return (await this.api.list(
            apiVersion,
            kind,
            namespace,
            pretty,
            exact,
            exportt,
            fieldSelector,
            labelSelector,
            limit,
            continueToken,
            options,
        )).body as KubernetesListObject<T>;
    }

    public async update<T extends KubernetesObject>(
        spec: T,
        pretty?: string,
        dryRun?: string,
        fieldManager?: string,
        options?: { headers: { [name: string]: string } }
    ): Promise<void> {
        const res = await this.api.replace(spec, pretty, dryRun, fieldManager, options) as KubernetesResponse<T>;
        Object.assign(spec, res.body);
    }

    public async patch<T extends KubernetesObject>(
        spec: T,
        pretty?: string,
        dryRun?: string,
        fieldManager?: string,
        force?: boolean,
        options?: { headers: { [name: string]: string } },
    ): Promise<void> {
        const res = await this.api.patch(spec, pretty, dryRun, fieldManager, force, options) as KubernetesResponse<T>;
        Object.assign(spec, res.body);
    }

    public async watch(
        path: string,
        queryParams: Record<string, any>,
        callback: WatchCallback,
        done: (err: any) => void,
    ): Promise<RequestResult> {
        return this.watcher.watch(
            path,
            queryParams,
            callback as (phase: string, apiObj: any, watchObj?: any) => void,
            done,
        );
    }

    /**
     * Returns the api path for a kubernetes resource as it is needed by the watch method.
     */
    public async getAPIResourcePath(apiVersion: string, kind: string, namespace?: string): Promise<string> {
        return this.api.getAPIResourcePath(apiVersion, kind, namespace);
    }
}

/**
 * Wraps the KubernetesObjectApi to access protected methods.
 */
class KubernetesObjectApiWrapper extends KubernetesObjectApi {

    public setDefaultNamespace(kc: KubeConfig): string {
        return super.setDefaultNamespace(kc);
    }

    /**
     * Returns the api path for a kubernetes resource as it is needed by the watch method.
     */
    public async getAPIResourcePath(apiVersion: string, kind: string, namespace?: string): Promise<string> {
        const url = new URL(await this.specUriPath({
            apiVersion,
            kind,
            metadata: {
                namespace,
            },
        }, 'list'));
        return url.pathname;
    }
}
