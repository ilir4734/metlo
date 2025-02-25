import mlog from "logger"
import { DateTime } from "luxon"
import { ApiTrace } from "models"
import { AppDataSource } from "data-source"
import { aggregateTracesDataHourlyQuery } from "./queries"
import { MetloContext } from "types"
import { getQB } from "services/database/utils"

const clearApiTraces = async (ctx: MetloContext): Promise<void> => {
  const queryRunner = AppDataSource.createQueryRunner()
  await queryRunner.connect()
  try {
    const now = DateTime.now()

    const timeBack = now
      .minus({ hours: parseInt(process.env.RETENTION_HOURS) || 1 })
      .toJSDate()

    const maxTimeRes = await getQB(ctx, queryRunner)
      .select([`MAX("createdAt") as "maxTime"`])
      .from(ApiTrace, "traces")
      .andWhere('"apiEndpointUuid" IS NOT NULL')
      .andWhere('"createdAt" < :timeBack', { timeBack })
      .getRawOne()
    const maxTime: Date = maxTimeRes?.maxTime ?? null

    if (maxTime) {
      await queryRunner.startTransaction()
      await queryRunner.query(aggregateTracesDataHourlyQuery(ctx), [maxTime])
      await getQB(ctx, queryRunner)
        .delete()
        .from(ApiTrace)
        .andWhere('"apiEndpointUuid" IS NOT NULL')
        .andWhere('"createdAt" <= :maxTime', { maxTime })
        .execute()
      await queryRunner.commitTransaction()
    }
  } catch (err) {
    mlog.withErr(err).error("Encountered error while clearing trace data")
    await queryRunner.rollbackTransaction()
  } finally {
    await queryRunner?.release()
  }
}

export default clearApiTraces
