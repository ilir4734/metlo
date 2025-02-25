import { Response, Router } from "express"
import validator from "validator"
import { GetEndpointsService } from "services/get-endpoints"
import { GetEndpointParamsSchema } from "@common/api/endpoint"
import ApiResponseHandler from "api-response-handler"
import Error404NotFound from "errors/error-404-not-found"
import { MetloRequest } from "types"
import {
  getTopSuggestedPaths,
  updatePaths,
} from "services/get-endpoints/path-heuristic"
import { getHostsGraphHandler } from "./graph"
import {
  bulkDeleteDataFieldsHandler,
  clearAllSensitiveDataHandler,
  deleteDataFieldHandler,
  updateDataFieldClasses,
} from "./data-fields"
import {
  deleteHostsHandler,
  getHostsHandler,
  getHostsListHandler,
} from "./hosts"
import { getDataClassInfo } from "api/data-class"

export const getEndpointsHandler = async (
  req: MetloRequest,
  res: Response,
): Promise<void> => {
  const parsedQuery = GetEndpointParamsSchema.safeParse(req.query)
  if (parsedQuery.success == false) {
    return await ApiResponseHandler.zerr(res, parsedQuery.error)
  }
  try {
    const endpoints = await GetEndpointsService.getEndpoints(
      req.ctx,
      parsedQuery.data,
    )
    await ApiResponseHandler.success(res, endpoints)
  } catch (err) {
    await ApiResponseHandler.error(res, err)
  }
}

export const getEndpointHandler = async (
  req: MetloRequest,
  res: Response,
): Promise<void> => {
  const { endpointId } = req.params
  if (!validator.isUUID(endpointId)) {
    return await ApiResponseHandler.error(
      res,
      new Error404NotFound("Endpoint does not exist."),
    )
  }
  try {
    const endpoint = await GetEndpointsService.getEndpoint(req.ctx, endpointId)
    await ApiResponseHandler.success(res, endpoint)
  } catch (err) {
    await ApiResponseHandler.error(res, err)
  }
}

export const getUsageHandler = async (
  req: MetloRequest,
  res: Response,
): Promise<void> => {
  const { endpointId } = req.params
  if (!validator.isUUID(endpointId)) {
    return await ApiResponseHandler.error(
      res,
      new Error404NotFound("Endpoint does not exist."),
    )
  }
  try {
    const usageData = await GetEndpointsService.getUsage(req.ctx, endpointId)
    await ApiResponseHandler.success(res, usageData)
  } catch (err) {
    await ApiResponseHandler.error(res, err)
  }
}

export const updateEndpointIsAuthenticated = async (
  req: MetloRequest,
  res: Response,
): Promise<void> => {
  const { endpointId } = req.params
  if (!validator.isUUID(endpointId)) {
    return await ApiResponseHandler.error(
      res,
      new Error404NotFound("Endpoint does not exist."),
    )
  }
  try {
    const params: { authenticated: boolean } = req.body
    await GetEndpointsService.updateIsAuthenticated(
      req.ctx,
      endpointId,
      params.authenticated,
    )
    await ApiResponseHandler.success(res, "Success")
  } catch (err) {
    await ApiResponseHandler.error(res, err)
  }
}

export const deleteEndpointHandler = async (
  req: MetloRequest,
  res: Response,
): Promise<void> => {
  const { endpointId } = req.params
  if (!validator.isUUID(endpointId)) {
    return await ApiResponseHandler.error(
      res,
      new Error404NotFound("Endpoint does not exist."),
    )
  }
  try {
    await GetEndpointsService.deleteEndpoint(req.ctx, endpointId)
    await ApiResponseHandler.success(res, "Success")
  } catch (err) {
    await ApiResponseHandler.error(res, err)
  }
}

export const getSuggestedPathsHandler = async (
  req: MetloRequest,
  res: Response,
): Promise<void> => {
  const { endpointId } = req.params
  if (!validator.isUUID(endpointId)) {
    return await ApiResponseHandler.error(
      res,
      new Error404NotFound("Endpoint does not exist."),
    )
  }
  try {
    const suggestedPaths = await getTopSuggestedPaths(req.ctx, endpointId)
    await ApiResponseHandler.success(res, suggestedPaths)
  } catch (err) {
    await ApiResponseHandler.error(res, err)
  }
}

export const updatePathsHandler = async (
  req: MetloRequest,
  res: Response,
): Promise<void> => {
  const { endpointId } = req.params
  const { paths } = req.body
  try {
    if (!validator.isUUID(endpointId)) {
      throw new Error404NotFound("Endpoint does not exist.")
    }
    await updatePaths(req.ctx, paths, endpointId, true)
    await ApiResponseHandler.success(res)
  } catch (err) {
    await ApiResponseHandler.error(res, err)
  }
}

export default function registerEndpointRoutes(router: Router) {
  router.get("/api/v1/endpoints/hosts", getHostsHandler)
  router.get("/api/v1/endpoints", getEndpointsHandler)
  router.get("/api/v1/endpoint/:endpointId", getEndpointHandler)
  router.get("/api/v1/endpoint/:endpointId/usage", getUsageHandler)
  router.delete("/api/v1/hosts", deleteHostsHandler)
  router.get("/api/v1/hosts", getHostsListHandler)
  router.get("/api/v1/hosts-graph", getHostsGraphHandler)
  router.delete("/api/v1/endpoint/:endpointId", deleteEndpointHandler)
  router.get(
    "/api/v1/endpoint/:endpointId/suggested-paths",
    getSuggestedPathsHandler,
  )
  router.put(
    "/api/v1/endpoint/:endpointId/authenticated",
    updateEndpointIsAuthenticated,
  )
  router.post("/api/v1/endpoint/:endpointId/update-paths", updatePathsHandler)
  router.post(
    "/api/v1/data-field/:dataFieldId/update-classes",
    updateDataFieldClasses,
  )
  router.delete("/api/v1/data-field/:dataFieldId", deleteDataFieldHandler)
  router.post("/api/v1/clear-sensitive-data", clearAllSensitiveDataHandler)
  router.post("/api/v1/clear-all-datafields", bulkDeleteDataFieldsHandler)
  // DataClass
  router.get("/api/v1/data-class", getDataClassInfo)
}
