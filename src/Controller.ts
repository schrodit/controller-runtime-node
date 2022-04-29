import {Manager} from "./Manager";
import {KubernetesObject} from "@kubernetes/client-node";
import {KubeClient, ObjectKind} from "./KubeClient";
import {has} from "@0cfg/utils-common/lib/has";

export interface IController<T extends KubernetesObject> {
    setKubeClient(kubeClient: KubeClient): void;
    for(): ObjectKind<T>;
}

export abstract class Controller<T extends KubernetesObject> implements IController<T>{
    private _kubeClient?: KubeClient;

    constructor(
        private readonly object: ObjectKind<T>,
    ) {}

    public setKubeClient(kubeClient: KubeClient) {
        this._kubeClient = kubeClient;
    }

    public for(): ObjectKind<T> {
        return this.object;
    }

    protected kubeClient(): KubeClient {
        if (!has(this._kubeClient)) {
            throw new Error(`KubeClient not defined`);
        }
        return this._kubeClient;
    }

    abstract reconcile(object: T): Promise<void>;
}
