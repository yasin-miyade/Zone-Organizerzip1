import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { AdminGetSettings200, AdminLoginInput, AdminLoginResult, AdminToolUpdate, AdminUpdateSettings200, AdminUpdateSettingsBody, ErrorResponse, HealthStatus, SuccessResponse, Tool, ToolCategory, ToolStats, ToolTrackInput, ToolUsageResult } from './api.schemas';
import { customFetch } from '../custom-fetch';
import type { ErrorType, BodyType } from '../custom-fetch';
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
export declare const getHealthCheckUrl: () => string;
/**
 * Returns server health status
 * @summary Health check
 */
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListToolsUrl: () => string;
/**
 * Returns all visible file tools grouped by category
 * @summary List all tools
 */
export declare const listTools: (options?: RequestInit) => Promise<Tool[]>;
export declare const getListToolsQueryKey: () => readonly ["/api/tools"];
export declare const getListToolsQueryOptions: <TData = Awaited<ReturnType<typeof listTools>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTools>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listTools>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListToolsQueryResult = NonNullable<Awaited<ReturnType<typeof listTools>>>;
export type ListToolsQueryError = ErrorType<unknown>;
/**
 * @summary List all tools
 */
export declare function useListTools<TData = Awaited<ReturnType<typeof listTools>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTools>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetToolStatsUrl: () => string;
/**
 * Returns total conversions and top tools
 * @summary Get global tool usage stats
 */
export declare const getToolStats: (options?: RequestInit) => Promise<ToolStats>;
export declare const getGetToolStatsQueryKey: () => readonly ["/api/tools/stats"];
export declare const getGetToolStatsQueryOptions: <TData = Awaited<ReturnType<typeof getToolStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getToolStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getToolStats>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetToolStatsQueryResult = NonNullable<Awaited<ReturnType<typeof getToolStats>>>;
export type GetToolStatsQueryError = ErrorType<unknown>;
/**
 * @summary Get global tool usage stats
 */
export declare function useGetToolStats<TData = Awaited<ReturnType<typeof getToolStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getToolStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListToolCategoriesUrl: () => string;
/**
 * Returns all tool categories with tool counts
 * @summary List tool categories
 */
export declare const listToolCategories: (options?: RequestInit) => Promise<ToolCategory[]>;
export declare const getListToolCategoriesQueryKey: () => readonly ["/api/tools/categories"];
export declare const getListToolCategoriesQueryOptions: <TData = Awaited<ReturnType<typeof listToolCategories>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listToolCategories>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listToolCategories>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListToolCategoriesQueryResult = NonNullable<Awaited<ReturnType<typeof listToolCategories>>>;
export type ListToolCategoriesQueryError = ErrorType<unknown>;
/**
 * @summary List tool categories
 */
export declare function useListToolCategories<TData = Awaited<ReturnType<typeof listToolCategories>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listToolCategories>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getTrackToolUsageUrl: (toolSlug: string) => string;
/**
 * Increment usage counter for a tool
 * @summary Track tool usage
 */
export declare const trackToolUsage: (toolSlug: string, toolTrackInput: ToolTrackInput, options?: RequestInit) => Promise<ToolUsageResult>;
export declare const getTrackToolUsageMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof trackToolUsage>>, TError, {
        toolSlug: string;
        data: BodyType<ToolTrackInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof trackToolUsage>>, TError, {
    toolSlug: string;
    data: BodyType<ToolTrackInput>;
}, TContext>;
export type TrackToolUsageMutationResult = NonNullable<Awaited<ReturnType<typeof trackToolUsage>>>;
export type TrackToolUsageMutationBody = BodyType<ToolTrackInput>;
export type TrackToolUsageMutationError = ErrorType<ErrorResponse>;
/**
* @summary Track tool usage
*/
export declare const useTrackToolUsage: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof trackToolUsage>>, TError, {
        toolSlug: string;
        data: BodyType<ToolTrackInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof trackToolUsage>>, TError, {
    toolSlug: string;
    data: BodyType<ToolTrackInput>;
}, TContext>;
export declare const getGetToolUrl: (toolSlug: string) => string;
/**
 * Returns metadata for a single tool
 * @summary Get a specific tool
 */
export declare const getTool: (toolSlug: string, options?: RequestInit) => Promise<Tool>;
export declare const getGetToolQueryKey: (toolSlug: string) => readonly [`/api/tools/${string}`];
export declare const getGetToolQueryOptions: <TData = Awaited<ReturnType<typeof getTool>>, TError = ErrorType<ErrorResponse>>(toolSlug: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTool>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getTool>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetToolQueryResult = NonNullable<Awaited<ReturnType<typeof getTool>>>;
export type GetToolQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Get a specific tool
 */
export declare function useGetTool<TData = Awaited<ReturnType<typeof getTool>>, TError = ErrorType<ErrorResponse>>(toolSlug: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTool>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getAdminListToolsUrl: () => string;
/**
 * @summary Admin list all tools (including hidden)
 */
export declare const adminListTools: (options?: RequestInit) => Promise<Tool[]>;
export declare const getAdminListToolsQueryKey: () => readonly ["/api/admin/tools"];
export declare const getAdminListToolsQueryOptions: <TData = Awaited<ReturnType<typeof adminListTools>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminListTools>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof adminListTools>>, TError, TData> & {
    queryKey: QueryKey;
};
export type AdminListToolsQueryResult = NonNullable<Awaited<ReturnType<typeof adminListTools>>>;
export type AdminListToolsQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Admin list all tools (including hidden)
 */
export declare function useAdminListTools<TData = Awaited<ReturnType<typeof adminListTools>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminListTools>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getAdminUpdateToolUrl: (toolSlug: string) => string;
/**
 * @summary Update a tool's metadata
 */
export declare const adminUpdateTool: (toolSlug: string, adminToolUpdate: AdminToolUpdate, options?: RequestInit) => Promise<Tool>;
export declare const getAdminUpdateToolMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminUpdateTool>>, TError, {
        toolSlug: string;
        data: BodyType<AdminToolUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminUpdateTool>>, TError, {
    toolSlug: string;
    data: BodyType<AdminToolUpdate>;
}, TContext>;
export type AdminUpdateToolMutationResult = NonNullable<Awaited<ReturnType<typeof adminUpdateTool>>>;
export type AdminUpdateToolMutationBody = BodyType<AdminToolUpdate>;
export type AdminUpdateToolMutationError = ErrorType<ErrorResponse>;
/**
* @summary Update a tool's metadata
*/
export declare const useAdminUpdateTool: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminUpdateTool>>, TError, {
        toolSlug: string;
        data: BodyType<AdminToolUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminUpdateTool>>, TError, {
    toolSlug: string;
    data: BodyType<AdminToolUpdate>;
}, TContext>;
export declare const getAdminDeleteToolUrl: (toolSlug: string) => string;
/**
 * @summary Delete a tool
 */
export declare const adminDeleteTool: (toolSlug: string, options?: RequestInit) => Promise<SuccessResponse>;
export declare const getAdminDeleteToolMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminDeleteTool>>, TError, {
        toolSlug: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminDeleteTool>>, TError, {
    toolSlug: string;
}, TContext>;
export type AdminDeleteToolMutationResult = NonNullable<Awaited<ReturnType<typeof adminDeleteTool>>>;
export type AdminDeleteToolMutationError = ErrorType<ErrorResponse>;
/**
* @summary Delete a tool
*/
export declare const useAdminDeleteTool: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminDeleteTool>>, TError, {
        toolSlug: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminDeleteTool>>, TError, {
    toolSlug: string;
}, TContext>;
export declare const getAdminGetSettingsUrl: () => string;
/**
 * @summary Get all site settings
 */
export declare const adminGetSettings: (options?: RequestInit) => Promise<AdminGetSettings200>;
export declare const getAdminGetSettingsQueryKey: () => readonly ["/api/admin/settings"];
export declare const getAdminGetSettingsQueryOptions: <TData = Awaited<ReturnType<typeof adminGetSettings>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminGetSettings>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof adminGetSettings>>, TError, TData> & {
    queryKey: QueryKey;
};
export type AdminGetSettingsQueryResult = NonNullable<Awaited<ReturnType<typeof adminGetSettings>>>;
export type AdminGetSettingsQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Get all site settings
 */
export declare function useAdminGetSettings<TData = Awaited<ReturnType<typeof adminGetSettings>>, TError = ErrorType<ErrorResponse>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminGetSettings>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getAdminUpdateSettingsUrl: () => string;
/**
 * @summary Update site settings
 */
export declare const adminUpdateSettings: (adminUpdateSettingsBody: AdminUpdateSettingsBody, options?: RequestInit) => Promise<AdminUpdateSettings200>;
export declare const getAdminUpdateSettingsMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminUpdateSettings>>, TError, {
        data: BodyType<AdminUpdateSettingsBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminUpdateSettings>>, TError, {
    data: BodyType<AdminUpdateSettingsBody>;
}, TContext>;
export type AdminUpdateSettingsMutationResult = NonNullable<Awaited<ReturnType<typeof adminUpdateSettings>>>;
export type AdminUpdateSettingsMutationBody = BodyType<AdminUpdateSettingsBody>;
export type AdminUpdateSettingsMutationError = ErrorType<ErrorResponse>;
/**
* @summary Update site settings
*/
export declare const useAdminUpdateSettings: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminUpdateSettings>>, TError, {
        data: BodyType<AdminUpdateSettingsBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminUpdateSettings>>, TError, {
    data: BodyType<AdminUpdateSettingsBody>;
}, TContext>;
export declare const getAdminLoginUrl: () => string;
/**
 * @summary Admin login
 */
export declare const adminLogin: (adminLoginInput: AdminLoginInput, options?: RequestInit) => Promise<AdminLoginResult>;
export declare const getAdminLoginMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminLogin>>, TError, {
        data: BodyType<AdminLoginInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminLogin>>, TError, {
    data: BodyType<AdminLoginInput>;
}, TContext>;
export type AdminLoginMutationResult = NonNullable<Awaited<ReturnType<typeof adminLogin>>>;
export type AdminLoginMutationBody = BodyType<AdminLoginInput>;
export type AdminLoginMutationError = ErrorType<ErrorResponse>;
/**
* @summary Admin login
*/
export declare const useAdminLogin: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminLogin>>, TError, {
        data: BodyType<AdminLoginInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminLogin>>, TError, {
    data: BodyType<AdminLoginInput>;
}, TContext>;
export {};
//# sourceMappingURL=api.d.ts.map