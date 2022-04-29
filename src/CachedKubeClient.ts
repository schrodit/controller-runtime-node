import {
    KubeConfig,
} from '@kubernetes/client-node';
import {KubeClient, KubeClientReader, KubernetesObject, KubernetesResponse, WatchCallback} from './KubeClient';
import {DefaultKubeClient} from "./DefaultKubeClient";
import {isNotFoundError} from "./KubernetesError";


export class CachedKubeClient extends DefaultKubeClient implements KubeClient {
    public constructor(
        kubeConfig: KubeConfig,
        private readonly cache: KubeClientReader,
    ) {
        super(kubeConfig);
    }

    public async get<T extends KubernetesObject>(
        spec: T,
        pretty?: string,
        exact?: boolean,
        exportt?: boolean,
        options?: { headers: { [name: string]: string } }
    ): Promise<void> {
        try {
            await this.cache.get(spec, pretty, exact, exportt, options);
        } catch (e) {
            if (isNotFoundError(e)) {
                await super.get(spec, pretty, exact, exportt, options);
                return;
            }
            throw e;
        }
    }

}
