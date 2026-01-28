import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SiteSettings, MpesaSettings } from '@/types/database';
import { Save } from 'lucide-react';

export default function AdminSettings() {
  const [site, setSite] = useState<Partial<SiteSettings>>({});
  const [mpesa, setMpesa] = useState<Partial<MpesaSettings>>({});
  const { toast } = useToast();

  useEffect(() => {
    supabase.from('site_settings').select('*').limit(1).single().then(({ data }) => data && setSite(data));
    supabase.from('mpesa_settings').select('*').limit(1).single().then(({ data }) => data && setMpesa(data));
  }, []);

  const saveSite = async () => {
    await supabase.from('site_settings').update(site).eq('id', site.id);
    toast({ title: 'Site Settings Saved' });
  };

  const saveMpesa = async () => {
    await supabase.from('mpesa_settings').update(mpesa).eq('id', mpesa.id);
    toast({ title: 'M-Pesa Settings Saved' });
  };

  return (
    <Tabs defaultValue="site">
      <TabsList className="mb-6"><TabsTrigger value="site">Site Settings</TabsTrigger><TabsTrigger value="mpesa">M-Pesa</TabsTrigger></TabsList>
      
      <TabsContent value="site">
        <Card className="glass-card">
          <CardHeader><CardTitle>Site Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Site Name</Label><Input value={site.site_name || ''} onChange={(e) => setSite({...site, site_name: e.target.value})} /></div>
            <div><Label>Contact Email</Label><Input value={site.contact_email || ''} onChange={(e) => setSite({...site, contact_email: e.target.value})} /></div>
            <div><Label>Contact Phone</Label><Input value={site.contact_phone || ''} onChange={(e) => setSite({...site, contact_phone: e.target.value})} /></div>
            <div className="flex items-center gap-4">
              <div className="flex-1"><Label>Welcome Bonus Amount</Label><Input type="number" value={site.welcome_bonus_amount || 0} onChange={(e) => setSite({...site, welcome_bonus_amount: Number(e.target.value)})} /></div>
              <div className="flex items-center gap-2 pt-6"><Switch checked={site.welcome_bonus_enabled} onCheckedChange={(c) => setSite({...site, welcome_bonus_enabled: c})} /><Label>Enabled</Label></div>
            </div>
            <Button onClick={saveSite}><Save className="w-4 h-4 mr-2" />Save</Button>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="mpesa">
        <Card className="glass-card">
          <CardHeader><CardTitle>M-Pesa Daraja Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Paybill Number</Label><Input value={mpesa.paybill_number || ''} onChange={(e) => setMpesa({...mpesa, paybill_number: e.target.value})} /></div>
            <div><Label>Account Name</Label><Input value={mpesa.account_name || ''} onChange={(e) => setMpesa({...mpesa, account_name: e.target.value})} /></div>
            <div><Label>Consumer Key</Label><Input value={mpesa.consumer_key || ''} onChange={(e) => setMpesa({...mpesa, consumer_key: e.target.value})} /></div>
            <div><Label>Consumer Secret</Label><Input type="password" value={mpesa.consumer_secret || ''} onChange={(e) => setMpesa({...mpesa, consumer_secret: e.target.value})} /></div>
            <div><Label>Passkey</Label><Input type="password" value={mpesa.passkey || ''} onChange={(e) => setMpesa({...mpesa, passkey: e.target.value})} /></div>
            <div className="flex items-center gap-2"><Switch checked={mpesa.is_sandbox} onCheckedChange={(c) => setMpesa({...mpesa, is_sandbox: c})} /><Label>Sandbox Mode</Label></div>
            <Button onClick={saveMpesa}><Save className="w-4 h-4 mr-2" />Save</Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
