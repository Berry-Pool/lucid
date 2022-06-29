import Core from 'core/types';
import { Construct } from 'utils';
import { Blockfrost } from '../provider';

export type Provider = Blockfrost; // more providers can be added here

export type ProtocolParameters = {
  minFeeA: number;
  minFeeB: number;
  maxTxSize: number;
  maxValSize: number;
  keyDeposit: BigInt;
  poolDeposit: BigInt;
  priceMem: number;
  priceStep: number;
  coinsPerUtxoWord: BigInt;
};

export type Slot = number;

export interface ProviderSchema {
  getProtocolParameters(): Promise<ProtocolParameters>;
  getCurrentSlot(): Promise<Slot>;
  getUtxos(address: Address): Promise<UTxO[]>;
  getUtxosWithUnit?(address: Address, unit: Unit): Promise<UTxO[]>;
  getInputs?(utxo: UTxO, maxRetries: number, backoff: number): Promise<Address[]>;
  getDatum?(datumHash: DatumHash): Promise<Datum>;
  awaitTx?(txHash: TxHash): Promise<boolean>;
  submitTx?(tx: Core.Transaction): Promise<TxHash>;
}

export type Credential = {
  type: 'Key' | 'Script';
  hash: KeyHash | ScriptHash;
};

/** Concatenation of Policy Id and asset name in hex */
export type Unit = string;
export type Assets = {
  [unit: string]: BigInt;
};
export type ScriptType = 'Native' | 'PlutusV1' | 'PlutusV2';

/** Note: Plutus scripts need to be cbor encoded. Raw compiled script without the cbor encoding do not work.
 *
 * E.g. taking the cborHex coming from writeFileTextEnvelope works
 */
export type Script = { type: ScriptType; script: string };

/** Hex */
export type PolicyId = string;

export type Validator =
  | MintingPolicy
  | SpendingValidator
  | CertificateValidator
  | WithdrawalValidator;

/** Note: Plutus scripts need to be cbor encoded. Raw compiled script without the cbor encoding do not work.
 *
 * E.g. taking the cborHex coming from writeFileTextEnvelope works
 */
export type MintingPolicy = Script;
/** Note: Plutus scripts need to be cbor encoded. Raw compiled script without the cbor encoding do not work.
 *
 * E.g. taking the cborHex coming from writeFileTextEnvelope works
 */
export type SpendingValidator = Script;
/** Note: Plutus scripts need to be cbor encoded. Raw compiled script without the cbor encoding do not work.
 *
 * E.g. taking the cborHex coming from writeFileTextEnvelope works
 */
export type CertificateValidator = Script;
/** Note: Plutus scripts need to be cbor encoded. Raw compiled script without the cbor encoding do not work.
 *
 * E.g. taking the cborHex coming from writeFileTextEnvelope works
 */
export type WithdrawalValidator = Script;
/** bech32 */
export type Address = string;
/** bech32 */
export type RewardAddress = string;
/** Hex */
export type PaymentKeyHash = string;
/** Hex */
export type StakeKeyHash = string;
/** Hex */
export type KeyHash = string | PaymentKeyHash | StakeKeyHash;
/** Hex */
export type ScriptHash = string;
/** Hex */
export type TxHash = string;
/** bech32 */
export type PoolId = string;
/** Hex */
export type Datum = string;
/** Hex */
export type DatumHash = string;
/** Hex (Redeemer is only PlutusData, same as Datum) */
export type Redeemer = string; // Plutus Data (same as Datum)
export type Lovelace = BigInt;
export type Label = number;
/** Hex */
export type TransactionWitnesses = string;
/** Hex */
export type Transaction = string;

/** bech32 */
export type PrivateKey = string;

export type UTxO = {
  txHash: TxHash;
  outputIndex: number;
  assets: Assets;
  address: Address;
  datumHash?: DatumHash;
  datum?: Datum; // some providers may be able to return the datum as well in an efficient way
};

export type AddressType = {
  type: 'Base' | 'Enterprise' | 'Pointer' | 'Reward';
  address: Address;
};

export type Network = 'Mainnet' | 'Testnet';

export type AddressDetails = {
  address: AddressType;
  paymentCredential?: Credential;
  stakeCredential?: Credential;
};

/**
 * A wallet that can be constructed from external data
 * e.g UTxOs, collateral, and address
 */
export interface ExternalWallet {
  address: Address;
  utxos?: UTxO[];
  collateral?: UTxO[];
  rewardAddress?: RewardAddress;
}

export interface Wallet {
  address(): Promise<Address>;
  rewardAddress(): Promise<RewardAddress | undefined>;
  getCollateral(): Promise<UTxO[]>;
  getCollateralCore(): Promise<Core.TransactionUnspentOutput[]>;
  getUtxos(): Promise<UTxO[]>;
  getUtxosCore(): Promise<Core.TransactionUnspentOutputs>;
  signTx(tx: Core.Transaction): Promise<Core.TransactionWitnessSet>;
  submitTx(signedTx: Core.Transaction): Promise<TxHash>;
}

export type WalletProvider = 'nami' | 'eternl' | 'flint';

/**
 * These are the arguments that conform a BuiltinData in Plutus:
 *
 * ```hs
 * data Data =
 *   Constr Integer [Data]
 * | Map [(Data, Data)]
 * | List [Data]
 * | I Integer
 * | B BS.ByteString
 *   deriving stock (Show, Eq, Ord, Generic)
 *   deriving anyclass (NFData)
 * ```
 * So we can define an arbitrary mapping for these types
 *
 *```
 * bigint -> I
 * string -> B
 * Map    -> Map
 * list   -> List
 * ```
 *
 * Note: We need to wrap it in an object to prevent circular references
 */
export type PlutusData =
  | string
  | bigint
  | PlutusData[]
  | Map<PlutusData, PlutusData>
  | Construct; // We emulate the constr like this

/** JSON object */
export type Json = any;

/** Time in milliseconds */
export type UnixTime = number;

type NFTFile = {
  name: string;
  mediaType: string;
  src: string | string[];
};

export type NFTMetadataDetails = {
  name: string;
  image: string;
  mediaType?: string;
  description?: string | string[];
  files?: NFTFile[];
  [key: string]: any;
};

export type NFTMetadata = {
  [policyId: string]: {
    [assetName: string]: NFTMetadataDetails;
  };
  version?: any; // number
};
