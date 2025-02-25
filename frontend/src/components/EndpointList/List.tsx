import React from "react"
import {
  Badge,
  Box,
  Text,
  useColorMode,
  HStack,
  Tag,
  Tooltip,
} from "@chakra-ui/react"
import { useRouter } from "next/router"
import EmptyView from "components/utils/EmptyView"
import dynamic from "next/dynamic"
import { SortOrder, TableColumn } from "react-data-table-component"
import { RISK_TO_COLOR } from "~/constants"
import {
  getCustomStyles,
  rowStyles,
  SkeletonCell,
} from "components/utils/TableUtils"
import { ApiEndpoint, DataClass } from "@common/types"
import { getDateTimeRelative, getDateTimeString } from "utils"

const DataTable = dynamic(() => import("react-data-table-component"), {
  ssr: false,
})

const PAGE_SIZE = 10

interface EndpointTablesProps {
  endpoints: ApiEndpoint[]
  totalCount: number
  currentPage: number
  setCurrentPage: (e: number) => void
  fetching: boolean
  setOrdering: (e: "ASC" | "DESC") => void
  setOrderBy: (e: string | undefined) => void
  dataClasses: DataClass[]
}

interface TableLoaderProps {
  currentPage: number
  totalCount: number
}

const TableLoader: React.FC<TableLoaderProps> = ({
  currentPage,
  totalCount,
}) => {
  const colorMode = useColorMode()
  const loadingColumns: TableColumn<any>[] = [
    {
      name: "Risk",
      id: "riskScore",
      grow: 1,
    },
    {
      name: "Path",
      id: "path",
      grow: 3,
    },
    {
      name: "Sensitive Data Classes",
      id: "dataClasses",
      grow: 2,
    },
    {
      name: "Host",
      id: "host",
      grow: 2,
    },
    {
      name: "First Detected",
      id: "firstDetected",
      grow: 1.5,
    },
    {
      name: "Last Active",
      id: "lastActive",
      grow: 1.5,
    },
  ].map(e => ({
    ...e,
    sortable: false,
    cell: () => <SkeletonCell />,
  }))

  return (
    <Box w="full" h="full">
      <DataTable
        style={rowStyles}
        paginationComponentOptions={{ noRowsPerPage: true }}
        paginationTotalRows={totalCount}
        paginationServer
        columns={loadingColumns}
        data={Array.apply(null, Array(PAGE_SIZE)).map(() => {
          return {}
        })}
        customStyles={getCustomStyles(colorMode.colorMode)}
        pagination
        paginationDefaultPage={currentPage}
      />
    </Box>
  )
}

const List: React.FC<EndpointTablesProps> = React.memo(
  ({
    endpoints,
    totalCount,
    currentPage,
    fetching,
    setCurrentPage,
    setOrdering,
    setOrderBy,
    dataClasses,
  }) => {
    const router = useRouter()
    const colorMode = useColorMode()

    const handleSort = (
      column: TableColumn<ApiEndpoint>,
      sortDirection: SortOrder,
    ) => {
      setOrdering(sortDirection.toUpperCase() as "ASC" | "DESC")
      setOrderBy(column.id?.toString())
    }

    const columns: TableColumn<ApiEndpoint>[] = [
      {
        name: "Risk",
        sortable: false,
        selector: (row: ApiEndpoint) => row.riskScore || "",
        cell: (row: ApiEndpoint) => (
          <Badge
            fontSize="sm"
            fontWeight="medium"
            colorScheme={RISK_TO_COLOR[row.riskScore]}
            pointerEvents="none"
            p={1}
          >
            {row.riskScore}
          </Badge>
        ),
        id: "riskScore",
        grow: 0,
      },
      {
        name: "Method",
        sortable: false,
        cell: (row: ApiEndpoint) => (
          <Text pointerEvents="none" color="gray.900" fontWeight="semibold">
            {row.method}
          </Text>
        ),
        grow: 0,
        width: "100px",
      },
      {
        name: "Path",
        sortable: false,
        selector: (row: ApiEndpoint) => row.method + row.path,
        cell: (row: ApiEndpoint) => (
          <Text
            pointerEvents="none"
            fontWeight="medium"
            fontFamily="mono"
            color="gray.900"
          >
            {row.path}
          </Text>
        ),
        id: "path",
        grow: 4,
      },
      {
        name: "Sensitive Data Classes",
        sortable: false,
        cell: (row: ApiEndpoint) => {
          return (
            <Box pointerEvents="none">
              {row.dataClasses?.map(e => {
                return (
                  <Tag
                    px={2}
                    py={1}
                    m="2px"
                    fontSize="xx-small"
                    fontWeight="normal"
                    key={e}
                    colorScheme={
                      RISK_TO_COLOR[
                        dataClasses.find(({ className }) => className == e)
                          ?.severity
                      ]
                    }
                  >
                    {e}
                  </Tag>
                )
              })}
            </Box>
          )
        },
        id: "dataClasses",
        grow: 2,
      },
      {
        name: "Host",
        sortable: false,
        selector: (row: ApiEndpoint) => row.host || "",
        cell: (row: ApiEndpoint) => (
          <Text pointerEvents="none" fontWeight="normal">
            {row.host}
          </Text>
        ),
        id: "host",
        grow: 2,
      },
      {
        name: "First Detected",
        sortable: false,
        selector: (row: ApiEndpoint) =>
          getDateTimeString(row.firstDetected) || "N/A",
        cell: (row: ApiEndpoint) => (
          <Tooltip
            placement="top"
            label={getDateTimeString(row.firstDetected) || "N/A"}
            wordBreak="keep-all"
          >
            <Text data-tag="allowRowEvents" fontWeight="normal">
              {getDateTimeRelative(row.firstDetected) || "N/A"}
            </Text>
          </Tooltip>
        ),
        id: "firstDetected",
        grow: 1.5,
        right: true,
      },
      {
        name: "Last Active",
        sortable: false,
        selector: (row: ApiEndpoint) =>
          getDateTimeString(row.lastActive) || "N/A",
        cell: (row: ApiEndpoint) => (
          <Tooltip
            placement="top"
            label={getDateTimeString(row.lastActive) || "N/A"}
          >
            <Text data-tag="allowRowEvents" fontWeight="normal">
              {getDateTimeRelative(row.lastActive) || "N/A"}
            </Text>
          </Tooltip>
        ),
        id: "lastActive",
        right: true,
        grow: 1.5,
      },
    ]

    const onRowClicked = (
      row: ApiEndpoint,
      e: React.MouseEvent<Element, MouseEvent>,
    ) => {
      router.push(`/endpoint/${row.uuid}`)
    }

    const getTable = () => (
      <DataTable
        style={rowStyles}
        paginationComponentOptions={{ noRowsPerPage: true }}
        paginationTotalRows={totalCount}
        paginationServer
        onChangePage={setCurrentPage}
        progressPending={fetching}
        progressComponent={
          <TableLoader currentPage={currentPage} totalCount={totalCount} />
        }
        theme="solarized"
        columns={columns}
        data={endpoints}
        customStyles={getCustomStyles(colorMode.colorMode)}
        pagination
        onSort={handleSort}
        onRowClicked={onRowClicked}
        paginationDefaultPage={currentPage}
      />
    )

    if (totalCount == 0 && !fetching) {
      return <EmptyView text="No results found." />
    }
    if (totalCount > 0) {
      return getTable()
    }
    return null
  },
)

export default List
