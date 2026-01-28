import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Transaction } from '@/types/database';

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => setTransactions((data as Transaction[]) || []));
  }, []);

  return (
    <Card className="glass-card">
      <CardHeader><CardTitle>All Transactions</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell className="capitalize">{tx.type}</TableCell>
                <TableCell className={tx.amount > 0 ? 'text-green-500' : 'text-red-500'}>
                  KES {Math.abs(tx.amount).toFixed(2)}
                </TableCell>
                <TableCell className="capitalize">{tx.status}</TableCell>
                <TableCell>{new Date(tx.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
