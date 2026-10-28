import { NextRequest, NextResponse } from 'next/server';
import { getAllBlockchainTransactions, getBlockchainRecords } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/onchain/records - Retrieves blockchain records with their linked estimated emissions
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [records, transactions] = await Promise.all([
      getBlockchainRecords(),
      getAllBlockchainTransactions(),
    ]);
    const transactionsById = new Map(transactions.map((transaction) => [transaction.id, transaction]));
    const recordsWithEmissions = records.map((record) => ({
      ...record,
      emissionsKg: record.carbonRecordId
        ? transactionsById.get(`TXN_${record.carbonRecordId}`)?.amount ?? null
        : null,
    }));

    return NextResponse.json(recordsWithEmissions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to get blockchain records' }, { status: 500 });
  }
}
