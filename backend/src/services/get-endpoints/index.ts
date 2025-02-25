import mlog from "logger"
import { QueryRunner } from "typeorm"
import { AppDataSource } from "data-source"
import {
  ApiEndpoint,
  ApiEndpointTest,
  ApiTrace,
  AggregateTraceDataHourly,
  Alert,
  DataField,
  OpenApiSpec,
  Attack,
} from "models"
import {
  ApiEndpoint as ApiEndpointResponse,
  ApiEndpointDetailed as ApiEndpointDetailedResponse,
  Usage as UsageResponse,
  HostResponse,
} from "@common/types"
import { DeleteHostBatchParams, GetHostParams } from "@common/api/endpoint"
import { GetEndpointParams } from "@common/api/endpoint"
import Error500InternalServer from "errors/error-500-internal-server"
import Error404NotFound from "errors/error-404-not-found"
import { getRiskScore } from "utils"
import { getEndpointsCountQuery, getEndpointsQuery } from "./queries"
import {
  createQB,
  getEntityManager,
  getQB,
  getRepoQB,
  getRepository,
} from "services/database/utils"
import { MetloContext } from "types"
import { retryTypeormTransaction } from "utils/db"
import { RedisClient } from "utils/redis"

const getDataFieldsQuery = (ctx: MetloContext) => `
SELECT
  uuid,
  "dataClasses"::text[],
  "falsePositives"::text[],
  "scannerIdentified"::text[],
  "dataType",
  "dataTag",
  "dataSection",
  "createdAt",
  "updatedAt",
  "dataPath",
  "apiEndpointUuid",
  "statusCode",
  "contentType",
  "arrayFields",
  "isNullable"
FROM ${DataField.getTableName(ctx)} data_field 
WHERE
  "apiEndpointUuid" = $1
ORDER BY
  "dataTag" ASC,
  "statusCode" ASC,
  "contentType" ASC,
  "dataPath" ASC
`

export class GetEndpointsService {
  static async deleteEndpoint(
    ctx: MetloContext,
    apiEndpointUuid: string,
  ): Promise<void> {
    const queryRunner = AppDataSource.createQueryRunner()
    try {
      await queryRunner.connect()
      const endpoint = await getEntityManager(ctx, queryRunner).findOneBy(
        ApiEndpoint,
        { uuid: apiEndpointUuid },
      )
      if (!endpoint) {
        throw new Error404NotFound("Endpoint not found.")
      }
      const host = endpoint.host
      await queryRunner.startTransaction("SERIALIZABLE")
      await retryTypeormTransaction(
        () =>
          getQB(ctx, queryRunner)
            .delete()
            .from(AggregateTraceDataHourly)
            .andWhere(`"apiEndpointUuid" = :id`, { id: apiEndpointUuid })
            .execute(),
        5,
        true,
      )
      await retryTypeormTransaction(
        () =>
          getQB(ctx, queryRunner)
            .delete()
            .from(Alert)
            .andWhere(`"apiEndpointUuid" = :id`, { id: apiEndpointUuid })
            .execute(),
        5,
        true,
      )
      await retryTypeormTransaction(
        () =>
          getQB(ctx, queryRunner)
            .delete()
            .from(ApiEndpointTest)
            .andWhere(`"apiEndpointUuid" = :id`, { id: apiEndpointUuid })
            .execute(),
        5,
        true,
      )
      await retryTypeormTransaction(
        () =>
          getQB(ctx, queryRunner)
            .delete()
            .from(ApiTrace)
            .andWhere(`"apiEndpointUuid" = :id`, { id: apiEndpointUuid })
            .execute(),
        5,
        true,
      )
      await retryTypeormTransaction(
        () =>
          getQB(ctx, queryRunner)
            .delete()
            .from(Attack)
            .andWhere(`"apiEndpointUuid" = :id`, { id: apiEndpointUuid })
            .execute(),
        5,
        true,
      )
      await retryTypeormTransaction(
        () =>
          getQB(ctx, queryRunner)
            .delete()
            .from(DataField)
            .andWhere(`"apiEndpointUuid" = :id`, { id: apiEndpointUuid })
            .execute(),
        5,
        true,
      )
      await retryTypeormTransaction(
        () =>
          getQB(ctx, queryRunner)
            .delete()
            .from(ApiEndpoint)
            .andWhere("uuid = :id", { id: apiEndpointUuid })
            .execute(),
        5,
        true,
      )
      const numEndpointsForHost = await getQB(ctx, queryRunner)
        .select(["uuid", "host"])
        .from(ApiEndpoint, "endpoint")
        .andWhere("host = :host", { host })
        .getCount()
      if (numEndpointsForHost === 0) {
        await this.deleteHostAutogeneratedSpec(ctx, host, queryRunner)
      }
      await queryRunner.commitTransaction()
    } catch (err) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction()
      }
      if (err.code === "25P02") {
        throw new Error500InternalServer(
          `Could not delete endpoint ${apiEndpointUuid} while there are incoming requests for endpoint`,
        )
      }
      throw new Error500InternalServer("")
    } finally {
      await queryRunner.release()
    }
  }

  static async deleteEndpointsBatch(
    ctx: MetloContext,
    apiEndpointUuids: string[],
    queryRunner: QueryRunner,
  ): Promise<void> {
    await retryTypeormTransaction(
      () =>
        getQB(ctx, queryRunner)
          .delete()
          .from(AggregateTraceDataHourly)
          .andWhere(`"apiEndpointUuid" IN(:...ids)`, { ids: apiEndpointUuids })
          .execute(),
      5,
      true,
    )
    await retryTypeormTransaction(
      () =>
        getQB(ctx, queryRunner)
          .delete()
          .from(Alert)
          .andWhere(`"apiEndpointUuid" IN(:...ids)`, { ids: apiEndpointUuids })
          .execute(),
      5,
      true,
    )
    await retryTypeormTransaction(
      () =>
        getQB(ctx, queryRunner)
          .delete()
          .from(ApiEndpointTest)
          .andWhere(`"apiEndpointUuid" IN(:...ids)`, { ids: apiEndpointUuids })
          .execute(),
      5,
      true,
    )
    await retryTypeormTransaction(
      () =>
        getQB(ctx, queryRunner)
          .delete()
          .from(ApiTrace)
          .andWhere(`"apiEndpointUuid" IN(:...ids)`, { ids: apiEndpointUuids })
          .execute(),
      5,
      true,
    )
    await retryTypeormTransaction(
      () =>
        getQB(ctx, queryRunner)
          .delete()
          .from(Attack)
          .andWhere(`"apiEndpointUuid" IN(:...ids)`, { ids: apiEndpointUuids })
          .execute(),
      5,
      true,
    )
    await retryTypeormTransaction(
      () =>
        getQB(ctx, queryRunner)
          .delete()
          .from(DataField)
          .andWhere(`"apiEndpointUuid" IN(:...ids)`, { ids: apiEndpointUuids })
          .execute(),
      5,
      true,
    )
    await retryTypeormTransaction(
      () =>
        getQB(ctx, queryRunner)
          .delete()
          .from(ApiEndpoint)
          .andWhere("uuid IN(:...ids)", { ids: apiEndpointUuids })
          .execute(),
      5,
      true,
    )
  }

  static async deleteHostAutogeneratedSpec(
    ctx: MetloContext,
    host: string,
    queryRunner: QueryRunner,
  ): Promise<void> {
    await retryTypeormTransaction(
      () =>
        getQB(ctx, queryRunner)
          .delete()
          .from(OpenApiSpec)
          .andWhere("name = :name", { name: `${host}-generated` })
          .andWhere(`"isAutoGenerated" = True`)
          .execute(),
      5,
      true,
    )
  }

  static async deleteHost(ctx: MetloContext, host: string): Promise<void> {
    const queryRunner = AppDataSource.createQueryRunner()
    try {
      await queryRunner.connect()
      const endpoints = await getQB(ctx, queryRunner)
        .select(["uuid"])
        .from(ApiEndpoint, "endpoint")
        .andWhere("host = :host", { host })
        .getRawMany()
      if (endpoints?.length > 0) {
        await queryRunner.startTransaction("SERIALIZABLE")
        await this.deleteEndpointsBatch(
          ctx,
          endpoints?.map(e => e.uuid),
          queryRunner,
        )
        await this.deleteHostAutogeneratedSpec(ctx, host, queryRunner)
        await queryRunner.commitTransaction()
      }
    } catch (err) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction()
      }
      if (err.code === "25P02") {
        throw new Error500InternalServer(
          `Could not remove host ${host} while there are incoming requests`,
        )
      }
      throw new Error500InternalServer("")
    } finally {
      await queryRunner.release()
    }
  }

  static async deleteHosts(
    ctx: MetloContext,
    deleteHostsParams: DeleteHostBatchParams,
  ): Promise<void> {
    const hosts = deleteHostsParams.hosts
    for (const host of hosts) {
      await this.deleteHost(ctx, host)
    }
  }

  static async updateIsAuthenticated(
    ctx: MetloContext,
    apiEndpointUuid: string,
    authenticated: boolean,
  ): Promise<void> {
    const endpoint = await getRepoQB(ctx, ApiEndpoint)
      .andWhere("uuid = :id", { id: apiEndpointUuid })
      .getRawOne()
    if (!endpoint) {
      throw new Error404NotFound("Endpoint does not exist.")
    }
    await createQB(ctx)
      .update(ApiEndpoint)
      .set({ isAuthenticatedUserSet: authenticated })
      .andWhere("uuid = :id", { id: apiEndpointUuid })
      .execute()
  }

  static async updateEndpointRiskScore(
    ctx: MetloContext,
    apiEndpointUuid: string,
  ): Promise<ApiEndpoint> {
    const apiEndpointRepository = getRepository(ctx, ApiEndpoint)
    const apiEndpoint = await apiEndpointRepository.findOne({
      where: {
        uuid: apiEndpointUuid,
      },
      relations: {
        dataFields: true,
      },
    })
    apiEndpoint.riskScore = getRiskScore(apiEndpoint.dataFields)
    await getRepoQB(ctx, ApiEndpoint)
      .andWhere("uuid = :uuid", { uuid: apiEndpointUuid })
      .update()
      .set({ riskScore: apiEndpoint.riskScore })
      .execute()
    return apiEndpoint
  }

  static async getEndpoints(
    ctx: MetloContext,
    getEndpointParams: GetEndpointParams,
  ): Promise<[ApiEndpointResponse[], number]> {
    const queryRunner = AppDataSource.createQueryRunner()
    try {
      await queryRunner.connect()
      let whereFilter = []
      let whereFilterString = ""
      let argNumber = 1
      const parameters = []

      if (getEndpointParams?.hosts) {
        whereFilter.push(`endpoint.host = ANY($${argNumber++})`)
        parameters.push(getEndpointParams.hosts)
      }
      if (getEndpointParams?.riskScores) {
        whereFilter.push(`endpoint."riskScore" = ANY($${argNumber++})`)
        parameters.push(getEndpointParams.riskScores)
      }
      if (getEndpointParams?.dataClasses) {
        whereFilter.push(`data_field."dataClasses" && $${argNumber++}`)
        parameters.push(getEndpointParams.dataClasses)
      }
      if (getEndpointParams?.methods) {
        whereFilter.push(`endpoint."method" = ANY($${argNumber++})`)
        parameters.push(getEndpointParams.methods)
      }
      if (getEndpointParams?.searchQuery) {
        whereFilter.push(`endpoint.path ILIKE $${argNumber++}`)
        parameters.push(`%${getEndpointParams.searchQuery}%`)
      }
      if (getEndpointParams?.isAuthenticated) {
        const isAuthenticated = getEndpointParams.isAuthenticated
        if (String(isAuthenticated) === "true") {
          whereFilter.push(
            '(endpoint."isAuthenticatedUserSet" = TRUE OR (endpoint."isAuthenticatedDetected" = TRUE AND (endpoint."isAuthenticatedUserSet" IS NULL OR endpoint."isAuthenticatedUserSet" = TRUE)))',
          )
        } else {
          whereFilter.push(
            '(endpoint."isAuthenticatedUserSet" = FALSE OR (endpoint."isAuthenticatedDetected" = FALSE AND (endpoint."isAuthenticatedUserSet" IS NULL OR endpoint."isAuthenticatedUserSet" = FALSE)))',
          )
        }
      }
      if (whereFilter.length > 0) {
        whereFilterString = `WHERE ${whereFilter.join(" AND ")}`
      }
      const limitFilter = `LIMIT ${getEndpointParams?.limit ?? 10}`
      const offsetFilter = `OFFSET ${getEndpointParams?.offset ?? 0}`

      const endpointResults = await queryRunner.query(
        getEndpointsQuery(ctx, whereFilterString, limitFilter, offsetFilter),
        parameters,
      )
      const countResults = await queryRunner.query(
        getEndpointsCountQuery(ctx, whereFilterString),
        parameters,
      )

      return [endpointResults, countResults?.[0]?.count]
    } catch (err) {
      mlog.withErr(err).error("Error in Get Endpoints service")
      throw new Error500InternalServer(err)
    } finally {
      await queryRunner.release()
    }
  }

  static async getEndpoint(
    ctx: MetloContext,
    endpointId: string,
  ): Promise<ApiEndpointDetailedResponse> {
    const queryRunner = AppDataSource.createQueryRunner()
    try {
      await queryRunner.connect()
      const endpoint = await getQB(ctx, queryRunner)
        .from(ApiEndpoint, "endpoint")
        .andWhere("uuid = :id", { id: endpointId })
        .getRawOne()
      if (!endpoint) {
        throw new Error404NotFound("Endpoint does not exist.")
      }
      const alerts = await getQB(ctx, queryRunner)
        .select(["uuid", "status"])
        .from(Alert, "alert")
        .andWhere(`"apiEndpointUuid" = :id`, { id: endpointId })
        .getRawMany()
      const dataFields: DataField[] = await queryRunner.query(
        getDataFieldsQuery(ctx),
        [endpointId],
      )
      const openapiSpec = await getQB(ctx, queryRunner)
        .from(OpenApiSpec, "spec")
        .andWhere("name = :name", { name: endpoint.openapiSpecName })
        .getRawOne()
      const traceKey = `endpointTraces:e#${endpoint.uuid}`
      const traceCache = (await RedisClient.lrange(ctx, traceKey, 0, 99)) || []
      const traces = traceCache.map(e => JSON.parse(e) as ApiTrace)
      const tests = await getEntityManager(ctx, queryRunner).find(
        ApiEndpointTest,
        {
          where: { apiEndpoint: { uuid: endpointId } },
        },
      )
      return {
        ...endpoint,
        alerts,
        dataFields,
        openapiSpec,
        traces: [...traces],
        tests: tests as Array<any>,
      }
    } catch (err) {
      mlog.withErr(err).error("Error in Get Endpoints service")
      throw new Error500InternalServer(err)
    } finally {
      await queryRunner.release()
    }
  }

  static async getHosts(ctx: MetloContext): Promise<string[]> {
    try {
      const hosts: { [host: string]: string }[] = await getRepoQB(
        ctx,
        ApiEndpoint,
      )
        .select(["host"])
        .distinct(true)
        .getRawMany()
      return hosts.map(host => host["host"])
    } catch (err) {
      mlog.withErr(err).error("Error in Get Endpoints service")
      throw new Error500InternalServer(err)
    }
  }

  static async getHostsList(
    ctx: MetloContext,
    getHostsParams: GetHostParams,
  ): Promise<[HostResponse[], any]> {
    const queryRunner = AppDataSource.createQueryRunner()
    try {
      await queryRunner.connect()

      let qb = getQB(ctx, queryRunner)
        .select(["host", `COUNT(uuid) as "numEndpoints"`])
        .from(ApiEndpoint, "endpoint")
        .distinct(true)
        .groupBy("host")
      let totalHostsQb = await getQB(ctx, queryRunner)
        .select([`COUNT(DISTINCT(host))::int as "numHosts"`])
        .from(ApiEndpoint, "endpoint")

      if (getHostsParams?.searchQuery) {
        qb = qb.andWhere("host ILIKE :searchQuery", {
          searchQuery: `%${getHostsParams.searchQuery}%`,
        })
        totalHostsQb = totalHostsQb.andWhere("host ILIKE :searchQuery", {
          searchQuery: `%${getHostsParams.searchQuery}%`,
        })
      }

      qb = qb
        .limit(getHostsParams?.limit ?? 10)
        .offset(getHostsParams?.offset ?? 0)

      const hostsResp = await qb.getRawMany()
      const totalHosts = await totalHostsQb.getRawOne()

      return [hostsResp, totalHosts?.numHosts ?? 0]
    } catch (err) {
      throw new Error500InternalServer(err)
    } finally {
      await queryRunner.release()
    }
  }

  static async getUsage(
    ctx: MetloContext,
    endpointId: string,
  ): Promise<UsageResponse[]> {
    try {
      const endpoint = await getRepoQB(ctx, ApiEndpoint)
        .andWhere("uuid = :id", { id: endpointId })
        .getRawOne()
      if (!endpoint) {
        throw new Error404NotFound("Endpoint does not exist.")
      }
      const usage = await getRepoQB(ctx, AggregateTraceDataHourly, "trace")
        .select([`DATE_TRUNC('day', hour) AS date`, `SUM("numCalls") AS count`])
        .andWhere(`"apiEndpointUuid" = :id`, { id: endpointId })
        .groupBy(`DATE_TRUNC('day', hour)`)
        .orderBy(`date`, "ASC")
        .getRawMany()
      return usage as UsageResponse[]
    } catch (err) {
      mlog.withErr(err).error("Error in Get Endpoints service")
      throw new Error500InternalServer(err)
    }
  }
}
