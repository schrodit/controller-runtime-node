import {has} from '@0cfg/utils-common/lib/has';
import {KubernetesObject} from "@kubernetes/client-node";

const resourceInfo = (resource: KubernetesObject): string => `[${resource.apiVersion}:${resource.kind} `
        + `${resource.metadata?.namespace}/${resource.metadata?.name}]`;

export class KubernetesError extends Error {
    constructor(
        public readonly error: unknown,
        public readonly resource?: KubernetesObject,
    ) {
        let msg = `${JSON.stringify(error)} - ${has(resource) ? resourceInfo(resource) : ''}`;
        if (isKubernetesError(error)) {
            msg = `Reason: ${error.body.reason}  Message: ${error.body.message} - ${resourceInfo}`;
        } else if (error instanceof Error) {
            msg = `${error.message} - ${resourceInfo}`;
        } else if (typeof error === 'string') {
            msg = error;
        }
        super(msg);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = this.constructor.name
    }
}

export class NotFound extends KubernetesError {
    public constructor(resource?: KubernetesObject) {
        super({
            code: 404,
            message: 'NOT FOUND',
        }, resource);
    }
}

interface IKubernetesError {
    body: {
        code: number,
        reason: string,
        message: string,
    },
}

export const isKubernetesError = (object: unknown): object is IKubernetesError => {
    const body = (object as IKubernetesError).body;
    return has(body) && [body.code, body.reason, body.message].every(has);
};

/**
 * Checks if the error is a resource not found error from Kubernetes.
 */
export const isNotFoundError = (err: unknown): boolean => {
    return isKubernetesError(err) && err.body.code === 404;
};
