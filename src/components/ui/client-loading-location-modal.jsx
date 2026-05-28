"use client"

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { MapPin, Search, Building2, X, Plus, Save, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export function ClientLoadingLocationModal({ isOpen, onClose, onSuccess }) {
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingAddress, setLoadingAddress] = useState('');
  const [loadingCoordinates, setLoadingCoordinates] = useState('');
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      fetchClients();
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = clients.filter(client =>
        client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.client_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.address?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredClients(filtered);
    } else {
      setFilteredClients(clients);
    }
  }, [searchTerm, clients]);

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, client_id, address, IsLoading, pickup_locations, coordinates')
        .eq('status', 'Active')
        .order('name');

      if (error) {
        console.error('Error fetching clients:', error);
      } else {
        setClients(data || []);
        setFilteredClients(data || []);
      }
    } catch (err) {
      console.error('Error:', err);
    }
    setIsLoading(false);
  };

  const handleClientSelect = (client) => {
    setSelectedClient(client);
    setLoadingAddress(client.address || '');
    setLoadingCoordinates(client.coordinates || '');
  };

  const handleToggleLoading = async (client, newValue) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ IsLoading: newValue })
        .eq('id', client.id);

      if (error) {
        console.error('Error updating client:', error);
        alert('Failed to update client loading status');
      } else {
        // Update local state
        setClients(clients.map(c => 
          c.id === client.id ? { ...c, IsLoading: newValue } : c
        ));
        
        if (selectedClient?.id === client.id) {
          setSelectedClient({ ...selectedClient, IsLoading: newValue });
        }
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Failed to update client loading status');
    }
  };

  const handleSaveLoadingLocation = async () => {
    if (!selectedClient) return;

    setIsSaving(true);
    try {
      // Get existing pickup locations
      const existingLocations = selectedClient.pickup_locations || [];
      
      // Add the new loading location if address is provided
      const updatedLocations = loadingAddress ? [
        ...existingLocations,
        {
          name: loadingAddress,
          coordinates: loadingCoordinates,
          type: 'loading_point',
          added_at: new Date().toISOString()
        }
      ] : existingLocations;

      const { error } = await supabase
        .from('clients')
        .update({
          IsLoading: true,
          pickup_locations: updatedLocations,
          address: loadingAddress || selectedClient.address,
          coordinates: loadingCoordinates || selectedClient.coordinates
        })
        .eq('id', selectedClient.id);

      if (error) {
        console.error('Error saving loading location:', error);
        alert('Failed to save loading location');
      } else {
        alert('Loading location saved successfully!');
        await fetchClients();
        setSelectedClient(null);
        setLoadingAddress('');
        setLoadingCoordinates('');
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Failed to save loading location');
    }
    setIsSaving(false);
  };

  const handleClose = () => {
    setSelectedClient(null);
    setSearchTerm('');
    setLoadingAddress('');
    setLoadingCoordinates('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            Manage Client Loading Locations
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex gap-4">
          {/* Left Panel - Client List */}
          <div className="w-1/2 flex flex-col border-r pr-4">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No clients found
                </div>
              ) : (
                filteredClients.map((client) => (
                  <div
                    key={client.id}
                    className={cn(
                      "p-3 border rounded-lg cursor-pointer transition-all hover:border-blue-400 hover:shadow-sm",
                      selectedClient?.id === client.id && "border-blue-500 bg-blue-50",
                      client.IsLoading && "border-green-300 bg-green-50/50"
                    )}
                    onClick={() => handleClientSelect(client)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <h4 className="font-medium truncate">{client.name}</h4>
                        </div>
                        {client.client_id && (
                          <p className="text-xs text-muted-foreground">{client.client_id}</p>
                        )}
                        {client.address && (
                          <p className="text-xs text-muted-foreground truncate mt-1">{client.address}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        {client.IsLoading && (
                          <Badge className="text-xs bg-green-100 text-green-800 border-green-300">
                            Loading Point
                          </Badge>
                        )}
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`toggle-${client.id}`} className="text-xs cursor-pointer">
                            {client.IsLoading ? 'Yes' : 'No'}
                          </Label>
                          <Switch
                            id={`toggle-${client.id}`}
                            checked={client.IsLoading || false}
                            onCheckedChange={(checked) => handleToggleLoading(client, checked)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Panel - Loading Location Details */}
          <div className="w-1/2 flex flex-col">
            {selectedClient ? (
              <div className="flex-1 flex flex-col">
                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-lg mb-1">{selectedClient.name}</h3>
                  {selectedClient.client_id && (
                    <p className="text-sm text-muted-foreground">ID: {selectedClient.client_id}</p>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-4">
                  <div>
                    <Label htmlFor="isLoading">
                      Is Loading Point?
                    </Label>
                    <div className="flex items-center gap-3 mt-2">
                      <Switch
                        id="isLoading"
                        checked={selectedClient.IsLoading || false}
                        onCheckedChange={(checked) => handleToggleLoading(selectedClient, checked)}
                      />
                      <span className="text-sm text-muted-foreground">
                        {selectedClient.IsLoading ? 'This client is a loading point' : 'This client is not a loading point'}
                      </span>
                    </div>
                  </div>

                  {selectedClient.IsLoading && (
                    <>
                      <div>
                        <Label htmlFor="loadingAddress">
                          Loading Address
                        </Label>
                        <Input
                          id="loadingAddress"
                          placeholder="Enter loading address..."
                          value={loadingAddress}
                          onChange={(e) => setLoadingAddress(e.target.value)}
                          className="mt-2"
                        />
                      </div>

                      <div>
                        <Label htmlFor="loadingCoordinates">
                          Coordinates (optional)
                        </Label>
                        <Input
                          id="loadingCoordinates"
                          placeholder="lat, lng (e.g., -26.2041, 28.0473)"
                          value={loadingCoordinates}
                          onChange={(e) => setLoadingCoordinates(e.target.value)}
                          className="mt-2"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Format: latitude, longitude
                        </p>
                      </div>

                      {selectedClient.pickup_locations && selectedClient.pickup_locations.length > 0 && (
                        <div>
                          <Label>Existing Pickup Locations</Label>
                          <div className="mt-2 space-y-2">
                            {selectedClient.pickup_locations.map((loc, idx) => (
                              <div key={idx} className="p-2 bg-gray-50 rounded text-sm">
                                <div className="flex items-start gap-2">
                                  <MapPin className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium">{loc.name || 'Unnamed location'}</p>
                                    {loc.coordinates && (
                                      <p className="text-xs text-muted-foreground">{loc.coordinates}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <Button
                        onClick={handleSaveLoadingLocation}
                        disabled={isSaving || !loadingAddress}
                        className="w-full"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Loading Location
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Select a client to manage loading location</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
