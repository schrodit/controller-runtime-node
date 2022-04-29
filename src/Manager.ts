import {Controller, IController} from "./Controller";
import {Cache} from "./Cache";
import {KubeClient} from "./KubeClient";
import {CachedKubeClient} from "./CachedKubeClient";
import {KubeConfig} from "@kubernetes/client-node";


export class Manager {
    private readonly cachedClient: KubeClient;

    public constructor(
        private readonly kubeConfig: KubeConfig,
        private readonly cache: Cache,
    ) {
        this.cachedClient = new CachedKubeClient(kubeConfig, cache);
    }

    public addController(controller: IController<any>) {
        controller.setKubeClient(this.cachedClient);
    }

}
