"use strict";

class TopicsRegistry {
    constructor(messageQueue) {
        this.messageQueue = messageQueue;
        this._deviceTopics = new Map();
    }

    /**
     * Register topic for id
     * @param {string} id Id the attach the topic to
     * @param {string} topic topic to be registered
     */
    register(id, topic) {
        let topics = this._deviceTopics.get(id);
        if (!topics) {
            topics = new Set();
            this._deviceTopics.set(id, topics);
        }
        topics.add(topic);
    }

    get(id) {
        return this._deviceTopics.get(id);
    }

    /**
     * Remove all topics registered for id
     * @param {string} id Id for wich all topics should be removed
     * @param {boolean} clear clear topics?
     */
    remove(id, clear) {
        const topics = this._deviceTopics.get(id);
        this._deviceTopics.delete(id);
        if (topics) {
            this.removeTopics(topics, clear);
        }
    }

    /**
     * Remove topics from message que
     * @param {string[]} topics topics to remove
     * @param {boolean} clear clear topic?
     */
    removeTopics(topics, clear) {
        if (topics) {
            for (let topic of topics) {
                this.removeTopic(topic);
                if (clear) {
                    this.clearTopic(topic);
                }
            }
        }
    }

    /**
     * Remove topic from message que
     * @param {string} topic topic to remove
     * @param {boolean} clear clear topic?
     */
    removeTopic(topic) {
        if (topic) {
            this.messageQueue.remove(topic);
        }
    }

    /**
     * Remove topic from broker (send retained empty message)
     * @param {string} topic topic to clear
     */
    clearTopic(topic) {
        if (topic) {
            this.messageQueue.add(topic, null, {retain: true});
        }
    }

    /**
     * Remove topics from broker (send retained empty messages)
     * @param {string[]} topics topics to clear
     */
    clearTopics(topics) {
        if (topics) {
            for (let topic of topics) {
                this.clearTopic(topic);
            }
        }
    }

    /**
     * Clear all messages from both queue & broker
     * */
    clear() {
        this._deviceTopics.forEach(topics => this.removeTopics(topics, true));
        this._deviceTopics.clear();
    }

    destroy() {
        this.clear();
    }
}

module.exports = TopicsRegistry;
