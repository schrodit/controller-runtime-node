import * as http from 'http';
import {
    KubernetesListObject,
    KubernetesObject as KO,
    RequestResult,
    V1DeleteOptions,
    V1ObjectMeta as om,
    V1Status,
} from '@kubernetes/client-node';

export interface KubernetesObject extends KO {
    apiVersion: string,
    kind: string,
    metadata: V1ObjectMeta,
}

export interface V1ObjectMeta extends om {
    name: string,
}

export type ObjectKind<T extends KO> = Pick<T, 'apiVersion' | 'kind'>;

export type ObjectHeader<T extends KO> = Pick<T, 'apiVersion' | 'kind' | 'metadata'>;

/**
 * Describes the type of an watch event.
 * Object is:
 * - If Type is Added or Modified: the new state of the object.
 * - If Type is Deleted: the state of the object immediately before deletion.
 * - If Type is Bookmark: the object (instance of a type being watched) where
 *   only ResourceVersion field is set. On successful restart of watch from a
 *   bookmark resourceVersion, client is guaranteed to not get repeat event
 *   nor miss any events.
 * - If Type is Error: *api.Status is recommended; other types may make sense
 *   depending on context.
 */
export enum KubernetesEventType {
    ADDED = 'ADDED',
    MODIFIED = 'MODIFIED',
    DELETED = 'DELETED',
    BOOKMARK = 'BOOKMARK',
    ERROR = 'ERROR',
}

export interface WatchObject {
    type: KubernetesEventType,
    object: KubernetesObject,
}

export type WatchCallback = (phase: KubernetesEventType, apiObj: any, watchObj?: WatchObject) => void

export interface KubernetesResponse<T> {
    body: T,
    response: http.IncomingMessage,
}

export interface KubeClientReader {
    /**
     * Read any Kubernetes resource.
     * @param spec Kubernetes resource spec
     * @param pretty If 'true', then the output is pretty printed.
     * @param exact Should the export be exact.  Exact export maintains cluster-specific fields like
     *        'Namespace'. Deprecated. Planned for removal in 1.18.
     * @param exportt Should this value be exported.  Export strips fields that a user can not
     *        specify. Deprecated. Planned for removal in 1.18.
     * @param options Optional headers to use in the request.
     * @return Promise containing the request response and [[KubernetesObject]].
     * @throws {KubernetesError}
     */
    get<T extends KubernetesObject>(
        spec: T,
        pretty?: string,
        exact?: boolean,
        exportt?: boolean,
        options?: { headers: { [name: string]: string } },
    ): Promise<void>
}

/**
 * Describes a Kubernetes client that implements the KubernetesObjectApi and Kubernetes Watch api.
 * The differences to the upstream KubernetesObjectApi are
 * - the objects are modified in-place and not returned.
 */
export interface KubeClient extends KubeClientReader{
    /**
     * Create any Kubernetes resource.
     * @param spec Kubernetes resource spec.
     * @param pretty If \&#39;true\&#39;, then the output is pretty printed.
     * @param dryRun When present, indicates that modifications should not be persisted. An invalid or unrecognized
     *        dryRun directive will result in an error response and no further processing of the request. Valid values
     *        are: - All: all dry run stages will be processed
     * @param fieldManager fieldManager is a name associated with the actor or entity that is making these changes. The
     *        value must be less than or 128 characters long, and only contain printable characters, as defined by
     *        https://golang.org/pkg/unicode/#IsPrint.
     * @param options Optional headers to use in the request.
     * @return Promise containing the request response and [[KubernetesObject]].
     * @throws {KubernetesError}
     */
    create<T extends KubernetesObject>(
        spec: T,
        pretty?: string,
        dryRun?: string,
        fieldManager?: string,
        options?: { headers: { [name: string]: string } },
    ): Promise<void>

    /**
     * Replace any Kubernetes resource.
     * @param spec Kubernetes resource spec
     * @param pretty If \&#39;true\&#39;, then the output is pretty printed.
     * @param dryRun When present, indicates that modifications should not be persisted. An invalid or unrecognized
     *        dryRun directive will result in an error response and no further processing of the request. Valid values
     *        are: - All: all dry run stages will be processed
     * @param fieldManager fieldManager is a name associated with the actor or entity that is making these changes. The
     *        value must be less than or 128 characters long, and only contain printable characters, as defined by
     *        https://golang.org/pkg/unicode/#IsPrint.
     * @param options Optional headers to use in the request.
     * @return Promise containing the request response and [[KubernetesObject]].
     * @throws {KubernetesError}
     */
    update<T extends KubernetesObject>(
        spec: T,
        pretty?: string,
        dryRun?: string,
        fieldManager?: string,
        options?: { headers: { [name: string]: string } },
    ): Promise<void>

    /**
     * Patch any Kubernetes resource.
     * @param spec Kubernetes resource spec
     * @param pretty If \&#39;true\&#39;, then the output is pretty printed.
     * @param dryRun When present, indicates that modifications should not be persisted. An invalid or unrecognized
     *        dryRun directive will result in an error response and no further processing of the request. Valid values
     *        are: - All: all dry run stages will be processed
     * @param fieldManager fieldManager is a name associated with the actor or entity that is making these changes. The
     *        value must be less than or 128 characters long, and only contain printable characters, as defined by
     *        https://golang.org/pkg/unicode/#IsPrint. This field is required for apply requests
     *        (application/apply-patch) but optional for non-apply patch types (JsonPatch, MergePatch,
     *        StrategicMergePatch).
     * @param force Force is going to 'force' Apply requests.  It means user will re-acquire conflicting
     *        fields owned by other people. Force flag must be unset for non-apply patch requests.
     * @param options Optional headers to use in the request.
     * @return Promise containing the request response and [[KubernetesObject]].
     * @throws {KubernetesError}
     */
    patch<T extends KubernetesObject>(
        spec: T,
        pretty?: string,
        dryRun?: string,
        fieldManager?: string,
        force?: boolean,
        options?: { headers: { [name: string]: string } },
    ): Promise<void>

    /**
     * Delete any Kubernetes resource.
     * @param spec Kubernetes resource spec
     * @param pretty If \&#39;true\&#39;, then the output is pretty printed.
     * @param dryRun When present, indicates that modifications should not be persisted. An invalid or unrecognized
     *        dryRun directive will result in an error response and no further processing of the request. Valid values
     *        are: - All: all dry run stages will be processed
     * @param gracePeriodSeconds The duration in seconds before the object should be deleted. Value must be non-negative
     *        integer. The value zero indicates delete immediately. If this value is nil, the default grace period for
     *        the specified type will be used. Defaults to a per object value if not specified. zero means delete
     *        immediately.
     * @param orphanDependents Deprecated: please use the PropagationPolicy, this field will be deprecated in
     *        1.7. Should the dependent objects be orphaned. If true/false, the 'orphan' finalizer will be
     *        added to/removed from the object\&#39;s finalizers list. Either this field or PropagationPolicy may be
     *        set, but not both.
     * @param propagationPolicy Whether and how garbage collection will be performed. Either this field or
     *        OrphanDependents may be set, but not both. The default policy is decided by the existing finalizer set in
     *        the metadata.finalizers and the resource-specific default policy. Acceptable values are:
     *        'Orphan' - orphan the dependents; 'Background' - allow the garbage collector to delete
     *        the dependents in the background; 'Foreground' - a cascading policy that deletes all dependents
     *        in the foreground.
     * @param body See [[V1DeleteOptions]].
     * @param options Optional headers to use in the request.
     * @return Promise containing the request response and a Kubernetes [[V1Status]].
     * @throws {KubernetesError}
     */
    delete<T extends KubernetesObject>(
        spec: T,
        pretty?: string,
        dryRun?: string,
        gracePeriodSeconds?: number,
        orphanDependents?: boolean,
        propagationPolicy?: string,
        body?: V1DeleteOptions,
        options?: { headers: { [name: string]: string } },
    ): Promise<V1Status>

    /**
     * List any Kubernetes resources.
     * @param apiVersion api group and version of the form <apiGroup>/<version>
     * @param kind Kubernetes resource kind
     * @param namespace list resources in this namespace
     * @param pretty If 'true', then the output is pretty printed.
     * @param exact Should the export be exact.  Exact export maintains cluster-specific fields like
     *        'Namespace'. Deprecated. Planned for removal in 1.18.
     * @param exportt Should this value be exported.  Export strips fields that a user can not
     *        specify. Deprecated. Planned for removal in 1.18.
     * @param fieldSelector A selector to restrict the list of returned objects by their fields. Defaults to everything.
     * @param labelSelector A selector to restrict the list of returned objects by their labels. Defaults to everything.
     * @param limit Number of returned resources.
     * @param options Optional headers to use in the request.
     * @return Promise containing the request response and [[KubernetesListObject<KubernetesObject>]].
     * @throws {KubernetesError}
     */
    list<T extends KubernetesObject>(
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
        options?: { headers: { [name: string]: string } },
    ): Promise<KubernetesListObject<T>>

    /**
     * Watch the resource and call provided callback with parsed json object
     * upon event received over the watcher connection.
     */
    watch(
        path: string,
        queryParams: any,
        callback: WatchCallback,
        done: (err: any) => void,
    ): Promise<RequestResult>

    /**
     * Returns the api path for a kubernetes resource as it is needed by the watch method.
     * @throws {KubernetesError}
     */
    getAPIResourcePath(apiVersion: string, kind: string, namespace?: string): Promise<string>
}
