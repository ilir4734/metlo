import { __DataClass_INTERNAL__ } from "@common/enums"
import {
  AADHAR_REGEXP,
  ADDRESS_REGEXP,
  COORDINATE_REGEXP,
  CREDIT_CARD_REGEXP,
  EMAIL_REGEXP,
  IP_ADDRESS_REGEXP,
  PHONE_NUMBER_REGEXP,
  SSN_REGEXP,
} from "services/scanner/regexp"
import { DataClass } from "@common/types"
import { validateAadhar } from "./validate"

export const __DATA_CLASS_REGEX_MAP_INTERNAL__ = {
  [__DataClass_INTERNAL__.ADDRESS]: ADDRESS_REGEXP,
  [__DataClass_INTERNAL__.COORDINATE]: COORDINATE_REGEXP,
  [__DataClass_INTERNAL__.CREDIT_CARD]: CREDIT_CARD_REGEXP,
  [__DataClass_INTERNAL__.EMAIL]: EMAIL_REGEXP,
  [__DataClass_INTERNAL__.IP_ADDRESS]: IP_ADDRESS_REGEXP,
  [__DataClass_INTERNAL__.PHONE_NUMBER]: PHONE_NUMBER_REGEXP,
  [__DataClass_INTERNAL__.SSN]: SSN_REGEXP,
  [__DataClass_INTERNAL__.AADHAR_NUMBER]: AADHAR_REGEXP,
}

const STRING_ONLY_DATA_CLASSES: Set<string> = new Set([
  __DataClass_INTERNAL__.PHONE_NUMBER,
  __DataClass_INTERNAL__.ADDRESS,
  __DataClass_INTERNAL__.COORDINATE,
  __DataClass_INTERNAL__.IP_ADDRESS,
  __DataClass_INTERNAL__.EMAIL,
  __DataClass_INTERNAL__.AADHAR_NUMBER,
])

export const VALIDATION_FUNC_MAP: Record<any, (e: string) => boolean> = {
  [__DataClass_INTERNAL__.AADHAR_NUMBER]: validateAadhar,
}

export const scan = (text: any, dataClasses: DataClass[]): string[] => {
  const res: string[] = []
  let convertedText: string
  try {
    convertedText = text.toString()
  } catch (err) {
    return res
  }
  dataClasses.forEach(({ className, regex: exp }) => {
    if (exp) {
      if (STRING_ONLY_DATA_CLASSES.has(className) && typeof text !== "string") {
        return
      }
      const r = new RegExp(exp)
      const match = r.test(convertedText)
      if (match) {
        const validationFunc = VALIDATION_FUNC_MAP[className]
        if (validationFunc) {
          const matchArr = convertedText.match(r)
          if (matchArr && validationFunc(matchArr[0])) {
            res.push(className)
          }
        } else {
          res.push(className)
        }
      }
    }
  })
  return res
}
