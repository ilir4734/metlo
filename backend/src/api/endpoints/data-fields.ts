import { Response } from "express"
import { updateDataClasses, deleteDataField } from "services/data-field"
import { UpdateDataFieldClassesParamsSchema } from "@common/api/endpoint"
import ApiResponseHandler from "api-response-handler"
import { GetEndpointsService } from "services/get-endpoints"
import { MetloRequest } from "types"
import { AppDataSource } from "data-source"
import { createQB, getQB } from "services/database/utils"
import { Alert, ApiEndpoint, DataField } from "models"
import Error500InternalServer from "errors/error-500-internal-server"
import { AlertType, RiskScore } from "@common/enums"

export const updateDataFieldClasses = async (
  req: MetloRequest,
  res: Response,
): Promise<void> => {
  const { dataFieldId } = req.params
  const parsedBody = UpdateDataFieldClassesParamsSchema.safeParse(req.body)
  if (parsedBody.success == false) {
    return await ApiResponseHandler.zerr(res, parsedBody.error)
  }
  try {
    const { dataClasses, dataPath, dataSection } = parsedBody.data
    const updatedDataField = await updateDataClasses(
      req.ctx,
      dataFieldId,
      dataClasses,
      dataPath,
      dataSection,
    )
    if (updatedDataField) {
      await GetEndpointsService.updateEndpointRiskScore(
        req.ctx,
        updatedDataField.apiEndpointUuid,
      )
    }
    await ApiResponseHandler.success(res, updatedDataField)
  } catch (err) {
    await ApiResponseHandler.error(res, err)
  }
}

export const deleteDataFieldHandler = async (
  req: MetloRequest,
  res: Response,
): Promise<void> => {
  try {
    const { dataFieldId } = req.params
    const removedDataField = await deleteDataField(req.ctx, dataFieldId)
    if (removedDataField) {
      await GetEndpointsService.updateEndpointRiskScore(
        req.ctx,
        removedDataField.apiEndpointUuid,
      )
    }
    await ApiResponseHandler.success(res, removedDataField)
  } catch (err) {
    await ApiResponseHandler.error(res, err)
  }
}

export const bulkDeleteDataFieldsHandler = async (
  req: MetloRequest,
  res: Response,
): Promise<void> => {
  try {
    await createQB(req.ctx).delete().from(DataField).execute()
    await createQB(req.ctx)
      .update(ApiEndpoint)
      .set({
        riskScore: RiskScore.NONE,
      })
      .execute()
    await createQB(req.ctx)
      .delete()
      .from(Alert)
      .andWhere(`"type" IN(:...alertTypes)`, {
        alertTypes: [
          AlertType.PII_DATA_DETECTED,
          AlertType.QUERY_SENSITIVE_DATA,
          AlertType.PATH_SENSITIVE_DATA,
          AlertType.UNAUTHENTICATED_ENDPOINT_SENSITIVE_DATA,
        ],
      })
      .execute()
    await ApiResponseHandler.success(res, "OK")
  } catch (err) {
    await ApiResponseHandler.error(res, err)
  }
}

export const clearAllSensitiveDataHandler = async (
  req: MetloRequest,
  res: Response,
): Promise<void> => {
  const queryRunner = AppDataSource.createQueryRunner()
  await queryRunner.connect()
  try {
    await queryRunner.startTransaction()
    await getQB(req.ctx, queryRunner)
      .update(DataField)
      .set({
        dataClasses: [],
        falsePositives: [],
        scannerIdentified: [],
        dataTag: null,
      })
      .execute()
    await getQB(req.ctx, queryRunner)
      .update(ApiEndpoint)
      .set({
        riskScore: RiskScore.NONE,
      })
      .execute()
    await getQB(req.ctx, queryRunner)
      .delete()
      .from(Alert)
      .andWhere(`"type" IN(:...alertTypes)`, {
        alertTypes: [
          AlertType.PII_DATA_DETECTED,
          AlertType.QUERY_SENSITIVE_DATA,
          AlertType.PATH_SENSITIVE_DATA,
          AlertType.UNAUTHENTICATED_ENDPOINT_SENSITIVE_DATA,
        ],
      })
      .execute()
    await queryRunner.commitTransaction()
    await ApiResponseHandler.success(res, "OK")
  } catch (err) {
    if (queryRunner.isTransactionActive) {
      await queryRunner.rollbackTransaction()
    }
    throw new Error500InternalServer(err)
  } finally {
    await queryRunner.release()
  }
}
