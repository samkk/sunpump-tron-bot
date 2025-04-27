import { TronWeb } from "tronweb";

/**
 * 验证地址是否正确
 * @param address
 */
export async function validateAddress(address: string) {
  return TronWeb.isAddress(address);
}
