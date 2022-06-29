import Core from 'core/types';
import { C } from '../core';
import { fromHex, toHex } from '../utils';
import {
  Address,
  Assets,
  Datum,
  DatumHash,
  ProtocolParameters,
  ProviderSchema,
  Slot,
  TxHash,
  Unit,
  UTxO,
} from '../types';

export class Blockfrost implements ProviderSchema {
  url: string;
  projectId: string;
  constructor(url: string, projectId: string) {
    this.url = url;
    this.projectId = projectId;
  }

  async getProtocolParameters(): Promise<ProtocolParameters> {
    const result = await fetch(`${this.url}/epochs/latest/parameters`, {
      headers: { project_id: this.projectId },
    }).then(res => res.json());

    return {
      minFeeA: parseInt(result.min_fee_a),
      minFeeB: parseInt(result.min_fee_b),
      maxTxSize: parseInt(result.max_tx_size),
      maxValSize: parseInt(result.max_val_size),
      keyDeposit: BigInt(result.key_deposit),
      poolDeposit: BigInt(result.pool_deposit),
      priceMem: parseFloat(result.price_mem),
      priceStep: parseFloat(result.price_step),
      coinsPerUtxoWord: BigInt(result.coins_per_utxo_word),
    };
  }
  async getCurrentSlot(): Promise<Slot> {
    return await fetch(`${this.url}/blocks/latest`, {
      headers: { project_id: this.projectId },
    })
      .then(res => res.json())
      .then(res => parseInt(res.slot));
  }

  async getUtxos(address: string): Promise<UTxO[]> {
    let result: any[] = [];
    let page = 1;
    /*eslint no-constant-condition: ["error", { "checkLoops": false }]*/
    while (true) {
      let pageResult = await fetch(
        `${this.url}/addresses/${address}/utxos?page=${page}`,
        { headers: { project_id: this.projectId } }
      ).then(res => res.json());
      if (pageResult.error) {
        if ((result as any).status_code === 400) return [];
        else if ((result as any).status_code === 500) return [];
        else {
          pageResult = [];
        }
      }
      result = result.concat(pageResult);
      if (pageResult.length <= 0) break;
      page++;
    }
    return result.map(r => ({
      txHash: r.tx_hash,
      outputIndex: r.output_index,
      assets: (() => {
        const a: Assets = {};
        r.amount.forEach((am: any) => {
          a[am.unit] = BigInt(am.quantity);
        });
        return a;
      })(),
      address,
      datumHash: r.data_hash,
    }));
  }

  async getUtxosWithUnit(address: Address, unit: Unit): Promise<UTxO[]> {
    let result: any[] = [];
    let page = 1;
    while (true) {
      let pageResult = await fetch(
        `${this.url}/addresses/${address}/utxos/${unit}?page=${page}`,
        { headers: { project_id: this.projectId } }
      ).then(res => res.json());
      if (pageResult.error) {
        if ((result as any).status_code === 400) return [];
        else if ((result as any).status_code === 500) return [];
        else {
          pageResult = [];
        }
      }
      result = result.concat(pageResult);
      if (pageResult.length <= 0) break;
      page++;
    }
    return result.map(r => ({
      txHash: r.tx_hash,
      outputIndex: r.output_index,
      assets: (() => {
        const a: Assets = {};
        r.amount.forEach((am: any) => {
          a[am.unit] = BigInt(am.quantity);
        });
        return a;
      })(),
      address,
      datumHash: r.data_hash,
    }));
  }

  async getInputs(utxo: UTxO, maxRetries: number = 5, backoff: number = 3000): Promise<Address[]> {
    let retries: number = 0;
    while (true) {
      let result = await fetch(
        `${this.url}/txs/${utxo.txHash}/utxos`,
        { headers: { project_id: this.projectId } }
      ).then(res => res.json());
      if (result && !result.error) {
        let inputs: any[] = result.inputs;
        return inputs.map(input => input.address);
      }
      if (retries >= maxRetries) {
        throw new Error(result);
      }
      await new Promise(resolve => setTimeout(resolve, backoff));
    }
  }

  async getDatum(datumHash: DatumHash): Promise<Datum> {
    const datum = await fetch(`${this.url}/scripts/datum/${datumHash}`, {
      headers: { project_id: this.projectId },
    })
      .then(res => res.json())
      .then(res => res.json_value);
    if (!datum || datum.error)
      throw new Error(`No datum found for datum hash: ${datumHash}`);
    return datumJsonToCbor(datum);
  }

  async awaitTx(txHash: TxHash): Promise<boolean> {
    return new Promise(res => {
      const confirmation = setInterval(async () => {
        const isConfirmed = await fetch(`${this.url}/txs/${txHash}`, {
          headers: { project_id: this.projectId },
        }).then(res => res.json());
        if (isConfirmed && !isConfirmed.error) {
          clearInterval(confirmation);
          res(true);
          return;
        }
      }, 3000);
    });
  }

  async submitTx(tx: Core.Transaction): Promise<TxHash> {
    const result = await fetch(`${this.url}/tx/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/cbor',
        project_id: this.projectId,
      },
      body: tx.to_bytes(),
    }).then(res => res.json());
    if (!result || result.error) {
      if (result?.status_code === 400) throw new Error(result.message);
      else throw new Error('Could not submit transaction.');
    }
    return result;
  }
}

/** This function is temporarily needed only, until Blockfrost returns the datum natively in cbor
 *
 * The conversion is ambigious, that's why it's better to get the datum directly in cbor
 */
export const datumJsonToCbor = (json: any): Datum => {
  const convert = (json: any): Core.PlutusData => {
    if (!isNaN(json.int)) {
      return C.PlutusData.new_integer(C.BigInt.from_str(json.int.toString()));
    } else if (json.bytes || !isNaN(json.bytes)) {
      return C.PlutusData.new_bytes(fromHex(json.bytes));
    } else if (json.map) {
      const m = C.PlutusMap.new();
      json.map.forEach(({ v, k }: any) => {
        m.insert(convert(k), convert(v));
      });
      return C.PlutusData.new_map(m);
    } else if (json.list) {
      const l = C.PlutusList.new();
      json.list.forEach((v: any) => {
        l.add(convert(v));
      });
      return C.PlutusData.new_list(l);
    } else if (!isNaN(json.constructor)) {
      const l = C.PlutusList.new();
      json.fields.forEach((v: any) => {
        l.add(convert(v));
      });
      return C.PlutusData.new_constr_plutus_data(
        C.ConstrPlutusData.new(
          C.BigNum.from_str(json.constructor.toString()),
          l
        )
      );
    }
    throw new Error('Unsupported type');
  };

  return toHex(convert(json).to_bytes());
};
