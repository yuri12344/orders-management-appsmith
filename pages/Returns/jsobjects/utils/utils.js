export default {
	
		idConverter: (num) => {
		let str = num.toString();
		let leadingZeros = "00000".substring(0, 5 - str.length);
		return 'R' + leadingZeros + str;
	},
	
	getReturns: async () => {
		const returns = await getReturns.run();

		const fromDate = dat_from.formattedDate || null;
		const toDate = dat_to.formattedDate || null;

		let filteredReturns = returns;

		// Filter based on date range if fromDate and toDate are provided
		if (fromDate && toDate) {
			filteredReturns = returns.filter(k => new Date(k.created) >= new Date(fromDate) && new Date(k.created) <= new Date(toDate));
		}

		// Filter based on status if sel_status is provided
		if (sel_status.selectedOptionValue) {
			filteredReturns = returns.filter(k => k.status === sel_status.selectedOptionValue);
		}

		return filteredReturns.map(r => {
			return {
				Id: r.id,
				ID: this.idConverter(r.id),
				OrderID: r.order_id,
				Product: r.name,
				Description: r.category,
				ShippedQty: r.quantity,
				Quantity: r.returned_quantity,
				Amount: r.price.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
				ReturnOrderID: 1,
				WarehouseName: r.label,
				ReturnedDate: new Date(r.returned_date).toDateString(),
				Reason: r.reason,
				Status: r.status,
				Warehouse: r.warehouse,
				WarehouseId: r.warehouse_id
			}
		}).sort((a, b) => a.id - b.id)
	},


	getWarehouses: async () => {
		const returns = await getReturns.run();
		const warehouses = returns.map(p => {
			return {
				id: p.warehouse_id,
				name: p.warehouse
			}
		});
		const sanitisedWarehouses = warehouses.filter(warehouse => warehouse.name !== null && warehouse.name.trim() !== "");

		if (!returns || returns.length < 1) {
			return [{
				id: 1,
				name: 'Jamison Yard',
			},
							{
								id: 2,
								name: 'Brit Avenue',
							}
						 ]
		}

		const uniqueWarehousesRaw = {}

		for (let i = 0; i < sanitisedWarehouses.length; i++) {
			// Add each string to the object as a key with a value of true
			uniqueWarehousesRaw[sanitisedWarehouses[i].name] = {
				id: sanitisedWarehouses[i].id
			};
		}


		// Get an array of unique strings from the object keys
		const uniqueWarehouses = Object.keys(uniqueWarehousesRaw);

		return uniqueWarehouses.map((category) => {
			return {
				id: uniqueWarehousesRaw[category].id,
				name: category,
			}
		})
	},

	markReceived: async () => {
		await markReceived.run();

		await this.getReturns();

		closeModal('mdl_returnsDetail');

		showAlert('Return Order Maked as Received!', 'success');
	},

	handleRefund: async () => {

		if (!sel_warehouse.selectedOptionValue || !sel_payment.selectedOptionValue) {
			return showAlert('Select warehouse and payment to continue', 'warning');
		}

		await handleRefund.run();

		await this.getReturns();

		closeModal('mdl_returnsDetail');

		showAlert('Refund Initiated!', 'success');
	},

	statusColor: (status) => {
		if (status === 'Return Initiated' || status === 'Reveived') {
			return 'RGB(255, 165, 0)';
		};
		if (status === 'Return Processed') {
			return 'RGB(0, 128, 0)'
		}
		return 'RGB(255, 165, 0)'
	},

	handleResetFilter: async () => {
		resetWidget('sel_status');
		resetWidget('dat_to');
		resetWidget('dat_from');

		await this.getReturns();
	},
}