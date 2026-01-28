import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, Ban, UserCheck, Trash2, Wallet } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface UserData { id: string; email: string; full_name: string | null; balance: number; role: string; created_at: string; }

export default function AdminUsers() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [search, setSearch] = useState('');
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const { toast } = useToast();

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, created_at');
    const { data: wallets } = await supabase.from('wallets').select('user_id, balance');
    const { data: roles } = await supabase.from('user_roles').select('user_id, role');
    
    const combined = profiles?.map(p => ({
      id: p.user_id,
      email: '',
      full_name: p.full_name,
      balance: wallets?.find(w => w.user_id === p.user_id)?.balance || 0,
      role: roles?.find(r => r.user_id === p.user_id)?.role || 'user',
      created_at: p.created_at,
    })) || [];
    
    setUsers(combined);
  };

  const adjustBalance = async () => {
    if (!selectedUser || adjustAmount === 0) return;
    
    const newBalance = Number(selectedUser.balance) + adjustAmount;
    if (newBalance < 0) {
      toast({ title: 'Error', description: 'Balance cannot be negative', variant: 'destructive' });
      return;
    }

    await supabase.from('wallets').update({ balance: newBalance }).eq('user_id', selectedUser.id);
    await supabase.from('transactions').insert({
      user_id: selectedUser.id,
      type: 'adjustment',
      amount: adjustAmount,
      status: 'completed',
      description: 'Admin adjustment',
    });

    toast({ title: 'Balance Updated', description: `Balance adjusted by KES ${adjustAmount}` });
    setSelectedUser(null);
    setAdjustAmount(0);
    fetchUsers();
  };

  const filteredUsers = users.filter(u => u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.id.includes(search));

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>User Management</CardTitle>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search users..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.full_name || 'N/A'}</TableCell>
                <TableCell className="capitalize">{user.role}</TableCell>
                <TableCell>KES {Number(user.balance).toFixed(2)}</TableCell>
                <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setSelectedUser(user)}>
                        <Wallet className="w-4 h-4 mr-1" /> Adjust
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Adjust Balance</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <p>Current: KES {Number(selectedUser?.balance || 0).toFixed(2)}</p>
                        <div>
                          <Label>Adjustment (+ or -)</Label>
                          <Input type="number" value={adjustAmount} onChange={(e) => setAdjustAmount(Number(e.target.value))} />
                        </div>
                        <Button onClick={adjustBalance} className="w-full">Apply Adjustment</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
