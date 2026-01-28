import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Bonus } from '@/types/database';
import { Plus, Save } from 'lucide-react';

export default function AdminBonuses() {
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState(100);
  const { toast } = useToast();

  useEffect(() => { fetchBonuses(); }, []);

  const fetchBonuses = async () => {
    const { data } = await supabase.from('bonuses').select('*').order('created_at', { ascending: false });
    setBonuses((data as Bonus[]) || []);
  };

  const createBonus = async () => {
    if (!name || amount <= 0) return;
    await supabase.from('bonuses').insert({ name, amount, bonus_type: 'promotional', is_active: true });
    toast({ title: 'Bonus Created' });
    setName(''); setAmount(100);
    fetchBonuses();
  };

  const toggleBonus = async (id: string, isActive: boolean) => {
    await supabase.from('bonuses').update({ is_active: !isActive }).eq('id', id);
    fetchBonuses();
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader><CardTitle>Create Bonus</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Amount (KES)</Label><Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></div>
          </div>
          <Button onClick={createBonus}><Plus className="w-4 h-4 mr-2" />Create Bonus</Button>
        </CardContent>
      </Card>
      
      <Card className="glass-card">
        <CardHeader><CardTitle>All Bonuses</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {bonuses.map((bonus) => (
              <div key={bonus.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <div>
                  <p className="font-medium">{bonus.name}</p>
                  <p className="text-sm text-muted-foreground">KES {bonus.amount} - {bonus.bonus_type}</p>
                </div>
                <Switch checked={bonus.is_active} onCheckedChange={() => toggleBonus(bonus.id, bonus.is_active)} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
