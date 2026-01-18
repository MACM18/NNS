"use client";

import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface AddDrumModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface InventoryItem {
    id: string;
    name: string;
}

export function AddDrumModal({ isOpen, onClose, onSuccess }: AddDrumModalProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [formData, setFormData] = useState({
        drum_number: "",
        item_id: "",
        initial_quantity: "",
        received_date: new Date().toISOString().split("T")[0],
        status: "active",
    });

    useEffect(() => {
        if (isOpen) {
            fetchItems();
        }
    }, [isOpen]);

    const fetchItems = async () => {
        try {
            const res = await fetch("/api/inventory?all=true");
            if (!res.ok) throw new Error("Failed to fetch inventory items");
            const json = await res.json();
            setItems(json.data || []);
        } catch (error) {
            console.error("Error fetching items:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const res = await fetch("/api/drums", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    drum_number: formData.drum_number,
                    item_id: formData.item_id,
                    initial_quantity: Number(formData.initial_quantity),
                    received_date: formData.received_date,
                    status: formData.status,
                }),
            });

            if (!res.ok) {
                throw new Error("Failed to create drum");
            }

            toast({
                title: "Success",
                description: "Drum created successfully",
            });
            onSuccess();
            onClose();
            // Reset form
            setFormData({
                drum_number: "",
                item_id: "",
                initial_quantity: "",
                received_date: new Date().toISOString().split("T")[0],
                status: "active",
            });
        } catch (error) {
            console.error("Error creating drum:", error);
            toast({
                title: "Error",
                description: "Failed to create drum",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Drum</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="drum_number">Drum Number</Label>
                        <Input
                            id="drum_number"
                            value={formData.drum_number}
                            onChange={(e) =>
                                setFormData({ ...formData, drum_number: e.target.value })
                            }
                            placeholder="e.g., DR-001"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="item_id">Cable Type</Label>
                        <Select
                            value={formData.item_id}
                            onValueChange={(val) => setFormData({ ...formData, item_id: val })}
                            required
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select cable type" />
                            </SelectTrigger>
                            <SelectContent>
                                {items.map((item) => (
                                    <SelectItem key={item.id} value={item.id}>
                                        {item.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="initial_quantity">Initial Quantity (meters)</Label>
                        <Input
                            id="initial_quantity"
                            type="number"
                            min="0"
                            step="0.1"
                            value={formData.initial_quantity}
                            onChange={(e) =>
                                setFormData({ ...formData, initial_quantity: e.target.value })
                            }
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="received_date">Received Date</Label>
                        <Input
                            id="received_date"
                            type="date"
                            value={formData.received_date}
                            onChange={(e) =>
                                setFormData({ ...formData, received_date: e.target.value })
                            }
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                            value={formData.status}
                            onValueChange={(val) => setFormData({ ...formData, status: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                                <SelectItem value="empty">Empty</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Create Drum" : "Create Drum"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
