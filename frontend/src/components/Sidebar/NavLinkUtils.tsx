import { TiFlowSwitch } from "@react-icons/all-files/ti/TiFlowSwitch"
import { FaHome } from "@react-icons/all-files/fa/FaHome"
import { FaShareAlt } from "@react-icons/all-files/fa/FaShareAlt"
import { FaBell } from "@react-icons/all-files/fa/FaBell"
import { AiFillLock } from "@react-icons/all-files/ai/AiFillLock"
import { AiFillSecurityScan } from "@react-icons/all-files/ai/AiFillSecurityScan"
import { AiFillApi } from "@react-icons/all-files/ai/AiFillApi"
import { IconType } from "@react-icons/all-files/lib"

export enum SideNavLinkDestination {
  Home,
  Endpoints,
  Alerts,
  Specs,
  Connections,
  SensitiveData,
  Vulnerabilities,
}

export const sideNavDestinationToLabel: (
  dest: SideNavLinkDestination,
) => string = dest => {
  switch (dest) {
    case SideNavLinkDestination.Home:
      return "Home"
    case SideNavLinkDestination.Endpoints:
      return "Endpoints"
    case SideNavLinkDestination.SensitiveData:
      return "Sensitive Data"
    case SideNavLinkDestination.Vulnerabilities:
      return "Vulnerabilities"
    case SideNavLinkDestination.Alerts:
      return "Alerts"
    case SideNavLinkDestination.Specs:
      return "API Specs"
    case SideNavLinkDestination.Connections:
      return "Connections"
    default:
      throw Error(`No value mapped for ${dest}`)
  }
}

export const sideNavDestinationToIcon: (
  dest: SideNavLinkDestination,
) => IconType = dest => {
  switch (dest) {
    case SideNavLinkDestination.Home:
      return FaHome
    case SideNavLinkDestination.Endpoints:
      return TiFlowSwitch
    case SideNavLinkDestination.SensitiveData:
      return AiFillLock
    case SideNavLinkDestination.Vulnerabilities:
      return AiFillSecurityScan
    case SideNavLinkDestination.Alerts:
      return FaBell
    case SideNavLinkDestination.Specs:
      return AiFillApi
    case SideNavLinkDestination.Connections:
      return FaShareAlt
    default:
      throw Error(`No value mapped for ${dest}`)
  }
}

export const sideNavDestinationToHref: (
  dest: SideNavLinkDestination,
) => string = dest => {
  switch (dest) {
    case SideNavLinkDestination.Home:
      return "/"
    case SideNavLinkDestination.Endpoints:
      return "/endpoints"
    case SideNavLinkDestination.SensitiveData:
      return "/sensitive-data"
    case SideNavLinkDestination.Vulnerabilities:
      return "/vulnerabilities"
    case SideNavLinkDestination.Alerts:
      return "/alerts"
    case SideNavLinkDestination.Specs:
      return "/specs"
    case SideNavLinkDestination.Connections:
      return "/connections"
    default:
      throw Error(`No value mapped for ${dest}`)
  }
}
