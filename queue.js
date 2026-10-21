// FIFO queue implemented as a singly linked list.
// enqueue and dequeue are both O(1).
class Queue {
  constructor() { this.head = null; this.tail = null; this.size = 0; }

  enqueue(value) {
    const node = { value, next: null };
    if (this.tail) this.tail.next = node;
    else this.head = node;
    this.tail = node;
    this.size++;
  }

  dequeue() {
    if (!this.head) return null;
    const node = this.head;
    this.head = node.next;
    if (!this.head) this.tail = null;
    this.size--;
    return node.value;
  }

  isEmpty() { return this.size === 0; }

  toArray() {
    const items = [];
    for (let cur = this.head; cur; cur = cur.next) items.push(cur.value);
    return items;
  }
}
