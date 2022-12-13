import axios, { AxiosRequestHeaders } from "axios"
import { OpenApiSpec } from "@common/types"
import { getAPIURL } from "~/constants"

export const getSpecs = async (
  headers?: AxiosRequestHeaders,
): Promise<[OpenApiSpec[], number]> => {
  try {
    const resp = await axios.get<[OpenApiSpec[], number]>(
      `${getAPIURL()}/specs`,
      { headers },
    )
    if (resp.status === 200 && resp.data) {
      return resp.data
    }
    return [[], 0]
  } catch (err) {
    console.error(`Error fetching endpoints: ${err}`)
    return [[], 0]
  }
}

export const uploadSpec = async (file: File, headers?: AxiosRequestHeaders) => {
  const formData = new FormData()
  formData.append("file", file)
  return await axios.post(`${getAPIURL()}/spec/new`, formData, {
    headers: {
      ...headers,
      "Content-Type": "multipart/form-data",
    },
  })
}

export const updateSpec = async (
  name: string,
  file: File,
  headers?: AxiosRequestHeaders,
) => {
  const formData = new FormData()
  formData.append("file", file)
  return await axios.put(`${getAPIURL()}/spec/${name}`, formData, {
    headers: {
      ...headers,
      "Content-Type": "multipart/form-data",
    },
  })
}

export const getSpec = async (name: string, headers?: AxiosRequestHeaders) => {
  const resp = await axios.get<OpenApiSpec>(`${getAPIURL()}/spec/${name}`, {
    headers,
  })
  return resp.data
}

export const deleteSpec = async (
  name: string,
  headers?: AxiosRequestHeaders,
) => {
  const resp = await axios.delete<OpenApiSpec>(`${getAPIURL()}/spec/${name}`, {
    headers,
  })
  return resp.data
}

export const getSpecZip = async (
  headers?: AxiosRequestHeaders,
) => {
  const resp = await axios.get(`${getAPIURL()}/specs/zip`, { headers })
  return resp.data
}
